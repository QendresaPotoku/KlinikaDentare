# Production deployment

For whoever deploys and runs the site: the website, the online booking API, the patient
cancellation page and the staff panel (`/admin/`). Everything runs as **one Node.js process** plus a
**PostgreSQL** database. Any Node host works (Render, Railway, Fly.io, a VPS with nginx); nothing below
is provider-specific.

> **Online booking starts OFF and must stay OFF** until the clinic has configured and checked
> dentists, services, schedules, email and SMS (see [Before switching online booking on](#before-switching-online-booking-on)).

---

## 1. Requirements

| | |
|---|---|
| Node.js | 22.18 or newer (runs the TypeScript scripts natively) |
| PostgreSQL | 15 or newer, with the standard `btree_gist` extension (available on Neon, Supabase, Railway, Render, RDS …) |
| HTTPS | Terminated by the host / reverse proxy in front of the Node server |
| SMTP | Any SMTP service for the clinic's notice about new online bookings |
| SMS | An SMS provider for patient confirmations and reminders (**not connected yet**, see [SMS](#5a-sms)) |

## 2. Environment variables

Set these in the host's environment settings. **Never commit a `.env` file with real values**
(`.env` is git-ignored; `.env.example` contains no secrets).

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `production`. Turns on the strict configuration check. |
| `DATABASE_URL` | yes | `postgres://user:password@host:5432/db`. Managed databases usually need `?sslmode=require`. |
| `PUBLIC_SITE_URL` | yes, **also at build time** | `https://www.your-domain.com` (no path). Used for canonical URLs, email links, cookie security and the proxy/origin checks. |
| `APP_SECRET` | yes | Random, at least 32 characters (see below). |
| `HOST`, `PORT` | as the host requires | Most hosts set `PORT` themselves; `HOST=0.0.0.0`. |
| `TRUST_PROXY` | yes behind a proxy | `true` when the app is behind Render/Railway/nginx (the usual case). Visitor IPs for rate limiting are then read from the **last** `X-Forwarded-For` entry. |
| `TRUST_PROXY_HOPS` | no | Number of trusted proxies (default 1). Only change for CDN + load balancer chains. |
| `EMAIL_PROVIDER` | yes | `smtp` in production (`console` only logs and is refused in production). |
| `SMTP_HOST`, `SMTP_PORT` | yes | Port 587 = STARTTLS (required); port 465 = TLS from the start with `SMTP_SECURE=true`. |
| `SMTP_SECURE` | no | `true` for port 465. |
| `SMTP_USER`, `SMTP_PASS` | usually | Both or neither. |
| `EMAIL_FROM` | yes | `Klinika Dentare Dr. Petriti & Dr. Vlera <termine@your-domain.com>` (an address on the verified domain). |
| `EMAIL_REPLY_TO` | no | Reply-to address of the clinic notice. |
| `SMS_PROVIDER` | for patient SMS | `none` (default: no SMS) or `console` (logs only). A real provider must be connected first, see [SMS](#5a-sms). |
| `NOTIFICATIONS_WORKER` | no | `on` (default). `off` only if another process sends queued emails and SMS. |
| `SMTP_ALLOW_INSECURE` | **never in production** | Local test mail servers only; refused when `NODE_ENV=production`. |

Check the configuration without starting the server:

```bash
NODE_ENV=production npm run check:env
```

`npm start` runs this check first and **does not start** when something critical is missing or unsafe
(placeholder or short `APP_SECRET`, `http://` or example `PUBLIC_SITE_URL`, missing SMTP settings,
insecure SMTP, malformed `DATABASE_URL`…). Messages name the variable, never its value. If the server is
started some other way with an invalid configuration, it answers 503 on every dynamic route and
`/api/health/` reports `{"ok":false,"reason":"config"}`.

### APP_SECRET

Generate it **once**:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

It signs the booking-form token and **derives every patient's private cancellation link**.

> **Do not rotate APP_SECRET casually.** Changing it makes every cancellation link already sent
> to patients stop working. Only rotate it if it has leaked; patients then cancel by phone.

It is server-only: never sent to browsers, never logged, never stored in the database.

## 3. Build, migrate, start

```bash
npm ci                     # exact versions from package-lock.json
npm run build              # PUBLIC_SITE_URL must be set (canonical URLs + proxy/domain settings)
npm run db:migrate         # apply pending migrations; exit code 1 = STOP the deploy
npm start                  # configuration check, then node ./dist/server/entry.mjs
```

On most hosts: build command `npm ci && npm run build`, pre-deploy/release command `npm run db:migrate`,
start command `npm start`, health check path `/api/health/`.

### Migrations

- Files in `db/migrations/` run in filename order, each in its own transaction, and are recorded in
  `schema_migrations` with a checksum.
- Already applied migrations are skipped. **Editing an applied migration is detected** and the run fails:
  always add a new file instead.
- Concurrent runs (two deploys at once) are serialised with a database lock.
- A failing migration rolls back that file and exits with code 1: the deploy must stop there, and the
  previous version keeps running.
- **Take a manual backup before any migration that changes or removes existing data.**

### First setup (once)

```bash
npm run admin:create -- --email reception@your-domain.com --name "Reception"
# optional, only for an EMPTY database: adds the two dentists (nothing else)
npm run db:seed -- --confirm
```

Nothing creates demo data in production: no demo appointments, schedules, services or staff
accounts. Services and working hours are entered by the clinic in `/admin/`.

### Health check

`GET /api/health/`: `200 {"ok":true}` when the configuration is valid and the database answers;
`503 {"ok":false,"reason":"config"|"database"}` otherwise. Nothing else (versions, hosts, errors) is exposed.

### Restarts and shutdown

On `SIGTERM` (redeploy) the server stops taking new notification jobs, finishes the email being sent
(max. 10 s), closes the database pool and exits. Appointments are always committed before any email is
attempted, so a restart never loses or corrupts bookings; an interrupted email is retried by the next
process.

## 4. HTTPS, proxy and cookies

The host's proxy terminates HTTPS and forwards plain HTTP to Node with `X-Forwarded-Proto`,
`X-Forwarded-Host` and `X-Forwarded-For`.

- **Build with the real `PUBLIC_SITE_URL`.** Astro then trusts forwarded headers for exactly that domain
  (`security.allowedDomains`), so requests are seen as `https://your-domain` and form posts (staff login,
  admin forms, patient cancellation) pass the cross-site check. Forwarded headers naming any other host
  are ignored. Without this, every form post fails with "Cross-site POST form submissions are forbidden".
- Serve **one** hostname. Redirect the other (`your-domain.com` → `www.your-domain.com` or vice versa)
  and HTTP → HTTPS at the host/DNS level.
- Set `TRUST_PROXY=true` behind the proxy so rate limits see the visitor IP (last `X-Forwarded-For`
  entry). Leave it `false` if the Node server is reached directly, otherwise visitors could fake their IP.
- The staff session cookie is `HttpOnly`, `SameSite=Lax`, `Secure` (because `PUBLIC_SITE_URL` is https)
  and limited to `/admin`.
- Dynamic responses send `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` and HSTS. For the
  static pages, add the same headers in the host's settings if it supports it (optional).
- Proxy access logs contain request paths, including the private part of patient cancellation links
  (`/sq/termin/…`). Keep access-log retention short at the host.

## 5. Email

Any SMTP service works (the clinic's mail host, Mailgun, Amazon SES, Brevo, Postmark, …):

1. Use a sender address on a domain you control (`EMAIL_FROM`).
2. Verify that domain with the email service and publish its **SPF** and **DKIM** DNS records.
3. Add a **DMARC** record (start with `p=none`, tighten later).
4. Use port 587 (STARTTLS) or 465 (TLS). Plain unencrypted SMTP is refused in production.
5. Send a real test (see the checklist) and check that it arrives in the inbox, not in spam.

The SMTP server *accepting* a message does not guarantee it reaches the inbox; that depends on SPF/DKIM/
DMARC and the sender's reputation. Delivery status per email is shown on each appointment page; failures
are retried automatically (1 min, 5 min, 30 min, 2 h, 6 h), permanent rejections are not.

The notification worker runs inside the Node process (every 60 s and right after each change). Several
instances may run at once: messages are claimed with database row locks, so each is sent once.

## 5a. SMS

Patients receive **no email**. They get two SMS in the language they booked in (sq / en / de):

1. **Booking confirmation**, right after an online booking: service, dentist, date, time (Kosovo time) and
   the private cancellation link.
2. **Reminder**, at the same Kosovo time on the day before the appointment (23 or 25 hours before across a
   daylight-saving change): service, dentist, date, time and the clinic's phone number. Also for
   appointments entered by staff. Not queued when the appointment is less than about 25 hours away; not
   sent for cancelled, completed or missed appointments, or less than 1 hour before the start. A
   reschedule replaces the reminder with one for the new time.

Numbers positively identified as landlines get no SMS (shown as such on the appointment page). Texts are
written in the GSM-7 alphabet (`ë`→`e`) so a confirmation stays within 2 billed SMS parts.

**No real SMS provider is connected yet.** With `SMS_PROVIDER=none`, due SMS are marked "SMS not
configured" on the appointment page. To connect one, implement the `SmsProvider` interface in
`src/server/notifications/sms.ts` (instructions in that file), set its credentials as environment variables
and register a sender ID with the provider. The SMS provider sees the message text, including the
cancellation link: choose one with short message-log retention.

The clinic's email notice about new online bookings is unchanged.

## 6. Database backups and data

- **Enable the managed database's automatic daily backups and point-in-time recovery** (Neon, Supabase,
  Railway, Render and RDS all offer this). Keep at least 7–30 days.
- **Before a risky migration** (one that rewrites data), take a manual snapshot in the provider's dashboard
  or with `pg_dump "$DATABASE_URL" --format=custom --file=backup-$(date +%F).dump`.
- **Restore**: create a new database from the snapshot (or `pg_restore --clean --no-owner -d "$NEW_DATABASE_URL" backup.dump`),
  point `DATABASE_URL` at it, restart. Try a restore once before going live so the procedure is known.
- Database credentials live only in the host's environment settings, never in the repository.
- Appointments, their history and notifications are the clinic's record. Do not delete rows by hand;
  appointments are cancelled, dentists and services are deactivated, and the application already refuses
  to delete anything with history.

### Rolling back a release

Redeploy the previous version. Migrations only ever add (they are written to be backward compatible with
the previous release); if a migration itself must be undone, restore the backup taken before it.

## 7. Before switching online booking on

In `/admin/`, check:

- [ ] Dentists: names, active, "accepts online bookings".
- [ ] Services: Albanian/English/German names, durations, "available online", which dentists provide them.
- [ ] Weekly schedules for every dentist who takes online bookings (lunch breaks as separate periods).
- [ ] Absences and special days already known (holidays, vacations, closures).
- [ ] Online booking settings: days in advance, minimum notice, time grid, online cancellation deadline,
      email required (normally off), clinic notification email, the "booking is off" message in all three languages.
- [ ] Clinic contact details on the website (`src/config/site.ts`).
- [ ] A real email test arrived (see checklist).
- [ ] A real SMS provider is connected and a test booking's confirmation SMS arrived on a mobile phone.
- [ ] "Kërkojnë vëmendje" is empty or understood.

Only then: `/admin/settings/` → **Rezervimi online është i ndezur**.

## 8. Development and test tooling (not used in production)

| Tool | Purpose |
|---|---|
| `docker-compose.yml` (`db`, optional `mail`) | Local PostgreSQL and the Mailpit test inbox |
| `klinika_test` database / `TEST_DATABASE_URL` | Wiped by every `npm test` run |
| `klinika_e2e` database (if present locally) | Demo data for browser tests; delete with `docker compose exec db psql -U klinika -c "DROP DATABASE klinika_e2e"` |
| `EMAIL_PROVIDER=console`, `SMTP_ALLOW_INSECURE` | Local only; refused in production |
| `npm run db:seed:demo` | Example services, dentist assignments and weekly hours for trying booking locally. Invented data; refused in production and for non-local databases |
| `MemoryEmailProvider`, `MemorySmsProvider` | Used by tests only |
| `SMS_PROVIDER=console` | Local only: logs SMS with a masked number, never the text |
