/**
 * Admin panel text (Albanian only, as agreed for V1) and small formatting helpers shared by the
 * server-rendered pages and the admin scripts.
 */

export const TIME_ZONE = 'Europe/Belgrade';

export const statusLabel: Record<string, string> = {
  scheduled: 'I planifikuar',
  completed: 'I kryer',
  cancelled: 'I anuluar',
  no_show: 'Nuk u paraqit',
};

export const sourceLabel: Record<string, string> = { online: 'Online', staff: 'Nga stafi' };
export const langLabel: Record<string, string> = { sq: 'Shqip', en: 'Anglisht', de: 'Gjermanisht' };

export const timeOffLabel: Record<string, string> = {
  vacation: 'pushim',
  sick: 'pushim mjekësor',
  training: 'trajnim',
  personal: 'mungesë personale',
  other: 'mungesë',
};

export function hhmm(minute: number): string {
  const m = Math.max(0, Math.min(1440, minute));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function periodsLabel(periods: { startMinute: number; endMinute: number }[]): string {
  return periods.map((p) => `${hhmm(p.startMinute)}–${hhmm(p.endMinute)}`).join(', ');
}

const dateLong = new Intl.DateTimeFormat('sq', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const dateShort = new Intl.DateTimeFormat('sq', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayMonth = new Intl.DateTimeFormat('sq', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/** 'YYYY-MM-DD' → "e martë, 6 tetor 2026" */
export const formatDateLong = (date: string) => dateLong.format(new Date(`${date}T12:00:00Z`));
/** 'YYYY-MM-DD' → "mar, 6 tet" */
export const formatDateShort = (date: string) => dateShort.format(new Date(`${date}T12:00:00Z`));
export const formatDayMonth = (date: string) => dayMonth.format(new Date(`${date}T12:00:00Z`));

/** Kosovo-time "HH:mm" and 'YYYY-MM-DD' of an instant. */
export const clinicTime = (d: Date | string) =>
  new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TIME_ZONE }).format(new Date(d));
export const clinicDate = (d: Date | string) => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(d));

export type IssueDetail =
  | { code: 'clinic_closed'; note: string | null }
  | { code: 'outside_working_hours'; hours: { startMinute: number; endMinute: number }[]; dayOff: boolean; noSchedule?: boolean }
  | { code: 'doctor_time_off'; reason: string; note: string | null };

/** Plain-language reason a staff-chosen time is outside normal availability. */
export function explainIssue(issue: IssueDetail, doctorName: string): string {
  switch (issue.code) {
    case 'clinic_closed':
      return `Klinika është e mbyllur në këtë datë${issue.note ? ` (${issue.note})` : ''}.`;
    case 'outside_working_hours':
      if (issue.noSchedule) return `${doctorName} nuk ka ende orar pune të konfiguruar.`;
      if (issue.dayOff) return `${doctorName} ka ditë të lirë në këtë datë.`;
      if (issue.hours.length === 0) return `${doctorName} nuk punon në këtë ditë.`;
      return `Kjo kohë është jashtë orarit të ${doctorName} (${periodsLabel(issue.hours)}).`;
    case 'doctor_time_off':
      return `${doctorName} është shënuar me ${timeOffLabel[issue.reason] ?? 'mungesë'} në këtë kohë${issue.note ? ` (${issue.note})` : ''}.`;
  }
}

/** Staff-facing messages for booking error codes (never raw database/API errors). */
export const errorMessage: Record<string, string> = {
  invalid_input: 'Disa fusha nuk janë plotësuar saktë. Kontrolloni të dhënat.',
  invalid_phone: 'Numri i telefonit nuk është i vlefshëm. Kontrolloni numrin dhe shtetin.',
  phone_landline: 'Numri i telefonit nuk është i vlefshëm.',
  service_unavailable: 'Ky shërbim nuk është më aktiv.',
  doctor_unavailable: 'Ky dentist nuk është më aktiv.',
  doctor_not_offering_service: 'Ky dentist nuk e ofron këtë shërbim.',
  appointment_conflict: 'Kjo kohë mbivendoset me një termin tjetër të këtij dentisti. Zgjidhni një kohë tjetër.',
  slot_unavailable: 'Kjo kohë sapo u zu. Zgjidhni një kohë tjetër.',
  working_rules: 'Kjo kohë është jashtë disponueshmërisë normale. Konfirmoni përjashtimin për të vazhduar.',
  in_past: 'Nuk mund të caktohet një termin në të kaluarën.',
  not_found: 'Termini nuk u gjet.',
  invalid_status: 'Ky veprim nuk është i mundur për statusin aktual të terminit.',
  concurrent_change: 'Termini u ndryshua nga një anëtar tjetër i stafit ndërkohë. Faqja u rifreskua; kontrolloni të dhënat dhe provoni përsëri.',
  unauthorized: 'Seanca juaj ka skaduar. Ju lutemi kyçuni përsëri.',
  network: 'Nuk u lidhëm dot me serverin. Kontrolloni internetin dhe provoni përsëri.',
  server_error: 'Ndodhi një gabim. Provoni përsëri pas pak.',
};
export const genericError = errorMessage.server_error;

export const weekdayShort = ['', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die'];
export const weekdayLong = ['', 'E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte', 'E shtunë', 'E diel'];

/** "Hën–Pre 08:00–12:00, 13:00–17:00 · Sht 09:00–13:00" (consecutive days with equal hours grouped). */
export function scheduleSummary(rows: { weekday: number; startMinute: number; endMinute: number }[]): string {
  if (rows.length === 0) return 'Pa orar pune';
  const byDay = new Map<number, string>();
  for (let d = 1; d <= 7; d++) {
    const label = periodsLabel(rows.filter((r) => r.weekday === d).sort((a, b) => a.startMinute - b.startMinute));
    if (label) byDay.set(d, label);
  }
  const groups: { from: number; to: number; label: string }[] = [];
  for (let d = 1; d <= 7; d++) {
    const label = byDay.get(d);
    if (!label) continue;
    const last = groups.at(-1);
    if (last && last.to === d - 1 && last.label === label) last.to = d;
    else groups.push({ from: d, to: d, label });
  }
  return groups
    .map((g) => `${g.from === g.to ? weekdayShort[g.from] : `${weekdayShort[g.from]}–${weekdayShort[g.to]}`} ${g.label}`)
    .join(' · ');
}

/** For the weekly editor: minute rows → [{ weekday, periods: [{ start, end }] }]. */
export function scheduleToEditor(rows: { weekday: number; startMinute: number; endMinute: number }[]) {
  const out: { weekday: number; periods: { start: string; end: string }[] }[] = [];
  for (let d = 1; d <= 7; d++) {
    const periods = rows
      .filter((r) => r.weekday === d)
      .sort((a, b) => a.startMinute - b.startMinute)
      .map((r) => ({ start: hhmm(r.startMinute), end: hhmm(r.endMinute) }));
    if (periods.length) out.push({ weekday: d, periods });
  }
  return out;
}
