import { DateTime } from 'luxon';
import { CLINIC_TIME_ZONE } from '../config.ts';
import { site } from '../../config/site.ts';
import type { Lang, NotificationPayload, NotificationType } from './outbox.ts';
import { formatPhone } from '../booking/phone.ts';

/**
 * Transactional email templates (sq / en / de) with HTML and plain-text versions. Deliberately plain:
 * table layout, inline styles, no images, web fonts or scripts, so they render in every client.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const CRIMSON = '#c9143c';

const T = {
  sq: {
    hello: (n: string) => `Përshëndetje ${n},`,
    service: 'Shërbimi',
    dentist: 'Dentisti',
    date: 'Data',
    time: 'Ora',
    kosovo: 'ora e Kosovës',
    before: 'Më parë',
    now: 'Tani',
    confirmSubject: (d: string, t: string) => `Termini juaj është rezervuar – ${d}, ${t}`,
    confirmLead: `Termini juaj në ${site.name} është rezervuar.`,
    manageText: 'Nëse nuk mund të vini, ju lutemi anulojeni terminin që ora të lirohet për pacientë të tjerë:',
    manageButton: 'Shiko ose anulo terminin',
    changeByPhone: 'Për ta ndryshuar terminin, na telefononi.',
    rescheduleSubject: (d: string, t: string) => `Termini juaj u ndryshua – ${d}, ${t}`,
    rescheduleLead: 'Termini juaj u zhvendos. Ja të dhënat e reja:',
    cancelSubject: (d: string) => `Termini juaj u anulua – ${d}`,
    cancelLead: (d: string, t: string) => `Termini juaj i ${d}, në orën ${t}, u anulua.`,
    cancelNext: 'Nëse dëshironi një termin të ri, mund ta rezervoni në faqen tonë ose na telefononi.',
    website: 'Faqja e klinikës',
    contact: 'Kontakti',
    footer: 'Ky email është dërguar për terminin tuaj. Nuk është email reklamues.',
  },
  en: {
    hello: (n: string) => `Hello ${n},`,
    service: 'Service',
    dentist: 'Dentist',
    date: 'Date',
    time: 'Time',
    kosovo: 'Kosovo time',
    before: 'Before',
    now: 'Now',
    confirmSubject: (d: string, t: string) => `Your appointment is booked – ${d}, ${t}`,
    confirmLead: `Your appointment at ${site.name} is booked.`,
    manageText: 'If you cannot come, please cancel the appointment so the time can be given to another patient:',
    manageButton: 'View or cancel appointment',
    changeByPhone: 'To change the appointment, please call us.',
    rescheduleSubject: (d: string, t: string) => `Your appointment has been changed – ${d}, ${t}`,
    rescheduleLead: 'Your appointment has been moved. These are the new details:',
    cancelSubject: (d: string) => `Your appointment has been cancelled – ${d}`,
    cancelLead: (d: string, t: string) => `Your appointment on ${d} at ${t} has been cancelled.`,
    cancelNext: 'If you would like a new appointment, you can book on our website or call us.',
    website: 'Clinic website',
    contact: 'Contact',
    footer: 'This email was sent about your appointment. It is not a marketing email.',
  },
  de: {
    hello: (n: string) => `Guten Tag ${n},`,
    service: 'Leistung',
    dentist: 'Zahnarzt',
    date: 'Datum',
    time: 'Uhrzeit',
    kosovo: 'Ortszeit Kosovo',
    before: 'Bisher',
    now: 'Neu',
    confirmSubject: (d: string, t: string) => `Ihr Termin ist gebucht – ${d}, ${t} Uhr`,
    confirmLead: `Ihr Termin in der ${site.name} ist gebucht.`,
    manageText: 'Falls Sie nicht kommen können, stornieren Sie den Termin bitte, damit er an andere Patienten vergeben werden kann:',
    manageButton: 'Termin ansehen oder stornieren',
    changeByPhone: 'Für eine Terminänderung rufen Sie uns bitte an.',
    rescheduleSubject: (d: string, t: string) => `Ihr Termin wurde geändert – ${d}, ${t} Uhr`,
    rescheduleLead: 'Ihr Termin wurde verschoben. Die neuen Angaben:',
    cancelSubject: (d: string) => `Ihr Termin wurde storniert – ${d}`,
    cancelLead: (d: string, t: string) => `Ihr Termin am ${d} um ${t} Uhr wurde storniert.`,
    cancelNext: 'Wenn Sie einen neuen Termin möchten, buchen Sie ihn auf unserer Website oder rufen Sie uns an.',
    website: 'Website der Klinik',
    contact: 'Kontakt',
    footer: 'Diese E-Mail betrifft Ihren Termin. Es handelt sich nicht um Werbung.',
  },
} as const;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function when(iso: string, lang: Lang) {
  const d = DateTime.fromISO(iso, { zone: CLINIC_TIME_ZONE }).setLocale(lang);
  const date = cap(d.toFormat(lang === 'de' ? 'cccc, d. LLLL yyyy' : 'cccc, d LLLL yyyy'));
  return { date, short: d.toFormat(lang === 'de' ? 'd. LLL' : 'd LLL'), time: d.toFormat('HH:mm') };
}

const serviceName = (p: NotificationPayload, lang: Lang) => (lang === 'en' ? p.serviceNames.en : lang === 'de' ? p.serviceNames.de : null) ?? p.serviceNames.sq;

function layout(lang: Lang, inner: string, footerNote: string, siteUrl: string): string {
  const t = T[lang];
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(site.name)}</title></head>
<body style="margin:0;padding:0;background:#f4f2ef;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ef;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-top:4px solid ${CRIMSON};">
<tr><td style="padding:24px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:${CRIMSON};">${esc(site.name)}</td></tr>
<tr><td style="padding:8px 28px 24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#171717;">${inner}</td></tr>
<tr><td style="padding:18px 28px 24px;border-top:1px solid #e6e2dc;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#625d58;">
<strong style="color:#171717;">${esc(site.name)}</strong><br>
${esc(site.address.line1)}, ${esc(site.address.line2)}<br>
${esc(t.contact)}: <a href="tel:+${site.phone.number}" style="color:#171717;">${esc(site.phone.display)}</a> · <a href="mailto:${esc(site.email)}" style="color:#171717;">${esc(site.email)}</a><br>
<a href="${esc(siteUrl)}/${lang}/" style="color:#171717;">${esc(t.website)}</a>
<p style="margin:14px 0 0;font-size:12px;color:#a39d96;">${esc(footerNote)}</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function detailsTable(rows: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:9px 12px 9px 0;border-bottom:1px solid #eeeae5;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#625d58;width:34%;vertical-align:top;">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #eeeae5;color:#171717;vertical-align:top;">${v}</td></tr>`,
    )
    .join('')}</table>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;"><tr><td style="background:${CRIMSON};">
<a href="${esc(href)}" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#ffffff;text-decoration:none;">${esc(label)}</a></td></tr></table>`;
}

const textFooter = (lang: Lang, siteUrl: string) => {
  const t = T[lang];
  return `\n--\n${site.name}\n${site.address.line1}, ${site.address.line2}\n${t.contact}: ${site.phone.display} · ${site.email}\n${siteUrl}/${lang}/\n\n${t.footer}`;
};

export interface RenderContext {
  siteUrl: string;
  /** Absolute manage/cancel URL (confirmation and reschedule only). */
  manageUrl?: string;
  /** Admin link (clinic notice only). */
  adminUrl?: string;
}

export function renderPatientEmail(type: Exclude<NotificationType, 'clinic_new_booking' | 'reminder'>, lang: Lang, p: NotificationPayload, ctx: RenderContext): RenderedEmail {
  const t = T[lang];
  const w = when(p.startsAt, lang);
  const svc = serviceName(p, lang);
  const timeCell = `${esc(w.time)} <span style="color:#625d58;">(${esc(t.kosovo)})</span>`;

  if (type === 'confirmation' || type === 'rescheduled') {
    const rows: [string, string][] = [];
    if (type === 'rescheduled' && p.previous) {
      const pw = when(p.previous.startsAt, lang);
      rows.push([t.before, `<span style="color:#625d58;text-decoration:line-through;">${esc(pw.date)}, ${esc(pw.time)}${p.previous.doctorName !== p.doctorName ? ` · ${esc(p.previous.doctorName)}` : ''}</span>`]);
      rows.push([t.now, `<strong>${esc(w.date)}, ${esc(w.time)}</strong>`]);
    } else {
      rows.push([t.date, esc(w.date)]);
    }
    rows.push([t.time, timeCell], [t.service, esc(svc)], [t.dentist, esc(p.doctorName)]);
    const lead = type === 'confirmation' ? t.confirmLead : t.rescheduleLead;
    const manage = ctx.manageUrl
      ? `<p style="margin:16px 0 4px;">${esc(t.manageText)}</p>${button(ctx.manageUrl, t.manageButton)}`
      : '';
    const html = layout(lang, `<p style="margin:0 0 12px;">${esc(t.hello(p.patientName))}</p><p style="margin:0;">${esc(lead)}</p>${detailsTable(rows)}${manage}<p style="margin:0;color:#625d58;font-size:14px;">${esc(t.changeByPhone)} ${esc(site.phone.display)}</p>`, t.footer, ctx.siteUrl);
    const textRows = [
      ...(type === 'rescheduled' && p.previous ? [`${t.before}: ${when(p.previous.startsAt, lang).date}, ${when(p.previous.startsAt, lang).time}${p.previous.doctorName !== p.doctorName ? ` (${p.previous.doctorName})` : ''}`] : []),
      `${type === 'rescheduled' ? t.now : t.date}: ${w.date}`,
      `${t.time}: ${w.time} (${t.kosovo})`,
      `${t.service}: ${svc}`,
      `${t.dentist}: ${p.doctorName}`,
    ];
    const text = `${t.hello(p.patientName)}\n\n${lead}\n\n${textRows.join('\n')}\n\n${ctx.manageUrl ? `${t.manageText}\n${ctx.manageUrl}\n\n` : ''}${t.changeByPhone} ${site.phone.display}${textFooter(lang, ctx.siteUrl)}`;
    const subject = type === 'confirmation' ? t.confirmSubject(w.short, w.time) : t.rescheduleSubject(w.short, w.time);
    return { subject, html, text };
  }

  // cancelled: confirmation of the cancellation, no action link.
  const lead = t.cancelLead(w.date, w.time);
  const rows: [string, string][] = [[t.date, `<span style="text-decoration:line-through;">${esc(w.date)}</span>`], [t.time, timeCell], [t.service, esc(svc)], [t.dentist, esc(p.doctorName)]];
  const html = layout(lang, `<p style="margin:0 0 12px;">${esc(t.hello(p.patientName))}</p><p style="margin:0;">${esc(lead)}</p>${detailsTable(rows)}<p style="margin:0;">${esc(t.cancelNext)}</p>`, t.footer, ctx.siteUrl);
  const text = `${t.hello(p.patientName)}\n\n${lead}\n\n${t.service}: ${svc}\n${t.dentist}: ${p.doctorName}\n\n${t.cancelNext}${textFooter(lang, ctx.siteUrl)}`;
  return { subject: t.cancelSubject(w.short), html, text };
}

/** Albanian notice to the clinic about a new online booking. */
export function renderClinicNotice(p: NotificationPayload, ctx: RenderContext): RenderedEmail {
  const w = when(p.startsAt, 'sq');
  const rows: [string, string][] = [
    ['Pacienti', esc(p.patientName)],
    ['Telefoni', esc(p.patientPhone ? formatPhone(p.patientPhone) : '')],
    ['Email-i', esc(p.patientEmail ?? '—')],
    ['Shërbimi', esc(p.serviceNames.sq)],
    ['Dentisti', esc(p.doctorName)],
    ['Koha', `${esc(w.date)}, ${esc(w.time)}`],
  ];
  if (p.patientNote) rows.push(['Shënimi', esc(p.patientNote).replace(/\n/g, '<br>')]);
  const html = layout('sq', `<p style="margin:0;">Një rezervim i ri u bë online.</p>${detailsTable(rows)}${ctx.adminUrl ? button(ctx.adminUrl, 'Hap terminin në panel') : ''}`, 'Njoftim i brendshëm nga sistemi i rezervimeve.', ctx.siteUrl);
  const text = `Një rezervim i ri u bë online.\n\nPacienti: ${p.patientName}\nTelefoni: ${p.patientPhone ? formatPhone(p.patientPhone) : ''}\nEmail-i: ${p.patientEmail ?? '—'}\nShërbimi: ${p.serviceNames.sq}\nDentisti: ${p.doctorName}\nKoha: ${w.date}, ${w.time}${p.patientNote ? `\nShënimi: ${p.patientNote}` : ''}\n\n${ctx.adminUrl ?? ''}`;
  return { subject: `Rezervim i ri online: ${p.patientName}, ${w.short} ${w.time}`, html, text };
}
