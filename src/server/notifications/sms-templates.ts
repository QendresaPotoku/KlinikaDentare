import { DateTime } from 'luxon';
import { CLINIC_TIME_ZONE } from '../config.ts';
import { site } from '../../config/site.ts';
import type { Lang, NotificationPayload } from './outbox.ts';
import { toGsm7 } from './sms.ts';

/**
 * Patient SMS texts (sq / en / de). Short and factual: no patient name (in case the number is
 * wrong), no marketing. Rewritten into the GSM-7 alphabet (Albanian "ë" would otherwise switch the
 * whole message to UCS-2 and double the billed parts): a reminder is usually 1 part, a confirmation
 * with its cancellation link 2.
 */

export type PatientSmsType = 'confirmation' | 'reminder';

export interface SmsRenderContext {
  /** Absolute manage/cancel URL; included in the confirmation only. */
  manageUrl?: string;
}

const MAX_SERVICE_CHARS = 40;

const T = {
  sq: {
    when: (date: string, time: string) => `${date}, ora ${time} (ora e Kosovës)`,
    confirmation: 'Termini juaj u rezervua',
    reminder: 'Kujtesë',
    cancelLink: 'Për ta anuluar:',
    callToChange: 'Për ndryshime na telefononi:',
    callIfAbsent: 'Nëse nuk vini, telefononi:',
  },
  en: {
    when: (date: string, time: string) => `${date}, ${time} (Kosovo time)`,
    confirmation: 'Your appointment is booked',
    reminder: 'Reminder',
    cancelLink: 'To cancel:',
    callToChange: 'To change it, please call',
    callIfAbsent: "Can't come? Please call",
  },
  de: {
    when: (date: string, time: string) => `${date}, ${time} Uhr (Ortszeit Kosovo)`,
    confirmation: 'Ihr Termin ist gebucht',
    reminder: 'Terminerinnerung',
    cancelLink: 'Stornieren:',
    callToChange: 'Für Änderungen rufen Sie uns bitte an:',
    callIfAbsent: 'Absage bitte unter',
  },
} as const;

const DATE_FORMAT: Record<Lang, string> = { sq: 'ccc d LLL', en: 'ccc d LLL', de: 'ccc, d. LLL' };

function serviceName(p: NotificationPayload, lang: Lang): string {
  const name = (lang === 'en' ? p.serviceNames.en : lang === 'de' ? p.serviceNames.de : null) ?? p.serviceNames.sq;
  return name.length > MAX_SERVICE_CHARS ? `${name.slice(0, MAX_SERVICE_CHARS - 3).trimEnd()}...` : name;
}

export function renderPatientSms(type: PatientSmsType, lang: Lang, p: NotificationPayload, ctx: SmsRenderContext = {}): string {
  const t = T[lang];
  const start = DateTime.fromISO(p.startsAt, { zone: CLINIC_TIME_ZONE }).setLocale(lang);
  const when = t.when(start.toFormat(DATE_FORMAT[lang]), start.toFormat('HH:mm'));
  const details = `${serviceName(p, lang)}, ${p.doctorName}, ${when}.`;
  const action =
    type === 'confirmation'
      ? ctx.manageUrl
        ? `${t.cancelLink} ${ctx.manageUrl}`
        : `${t.callToChange} ${site.phone.display}`
      : `${t.callIfAbsent} ${site.phone.display}`;
  return toGsm7(`${site.name}: ${t[type]}: ${details} ${action}`);
}
