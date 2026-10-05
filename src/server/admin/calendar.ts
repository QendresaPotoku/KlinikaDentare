import type { Db } from '../db/client.ts';
import { loadDayContexts } from '../booking/repository.ts';
import { workingPeriods, type MinutePeriod, type TimeOffReason } from '../booking/schedule.ts';
import { addDays, dayBounds, datesBetween, formatLocalTime, isoWeekday, localDateOf, localMinuteOf, todayLocal, type LocalDate } from '../time.ts';

/**
 * Data for the admin calendar. Day view: one column per dentist. Week view: one column per day
 * (all dentists, or the filtered one). Also an agenda list (used on phones).
 * Everything positional is in Kosovo wall-clock minutes, so blocks line up with the hour grid.
 */

export type CalendarView = 'day' | 'week';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface CalendarAppointment {
  id: string;
  doctorId: string;
  doctorName: string;
  serviceName: string;
  patientName: string;
  status: AppointmentStatus;
  source: 'online' | 'staff';
  date: LocalDate;
  startsAt: Date;
  endsAt: Date;
  /** Wall-clock minutes within `date`, clamped to the day. */
  startMinute: number;
  endMinute: number;
  timeLabel: string;
  /** Side-by-side placement when appointments overlap in one column. */
  lane: number;
  lanes: number;
}

export interface CalendarColumn {
  key: string;
  date: LocalDate;
  doctorId: string | null;
  title: string;
  /** Working periods to shade as open time; null = not shown (week view with all dentists). */
  working: MinutePeriod[] | null;
  timeOff: { startMinute: number; endMinute: number; reason: TimeOffReason; note: string | null }[];
  closed: { note: string | null } | null;
  appointments: CalendarAppointment[];
}

export interface CalendarDoctor {
  id: string;
  name: string;
  active: boolean;
  hasSchedule: boolean;
}

export interface CalendarData {
  view: CalendarView;
  date: LocalDate;
  from: LocalDate;
  to: LocalDate;
  today: LocalDate;
  doctors: CalendarDoctor[];
  doctorId: string | null;
  showCancelled: boolean;
  columns: CalendarColumn[];
  hourStart: number;
  hourEnd: number;
  /** Wall-clock minute of "now" when today is visible, else null. */
  nowMinute: number | null;
  agenda: { date: LocalDate; items: CalendarAppointment[]; working: { doctorName: string; periods: MinutePeriod[] }[] }[];
}

export function weekStart(date: LocalDate): LocalDate {
  return addDays(date, 1 - isoWeekday(date));
}

/** Assigns lanes so overlapping blocks sit side by side; each overlap cluster shares a lane count. */
export function layoutLanes<T extends { startMinute: number; endMinute: number; lane: number; lanes: number }>(items: T[]): T[] {
  const sorted = [...items].sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute);
  let cluster: T[] = [];
  let clusterEnd = -1;
  const laneEnds: number[] = [];
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1));
    for (const c of cluster) c.lanes = lanes;
    cluster = [];
    laneEnds.length = 0;
  };
  for (const item of sorted) {
    if (cluster.length && item.startMinute >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= item.startMinute);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = item.endMinute;
    item.lane = lane;
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMinute);
  }
  if (cluster.length) flush();
  return sorted;
}

const minuteOfDay = (instant: number, date: LocalDate) => {
  const d = localDateOf(instant);
  if (d < date) return 0;
  if (d > date) return 1440;
  return localMinuteOf(instant);
};

export async function loadCalendar(
  db: Db,
  input: { view: CalendarView; date: LocalDate; doctorId: string | null; showCancelled: boolean; now: number },
): Promise<CalendarData> {
  const today = todayLocal(input.now);
  const from = input.view === 'week' ? weekStart(input.date) : input.date;
  const to = input.view === 'week' ? addDays(from, 6) : input.date;
  const dates = datesBetween(from, to);
  const rangeStart = new Date(dayBounds(from).start);
  const rangeEnd = new Date(dayBounds(to).end);

  const doctorRows = await db<{ id: string; name: string; active: boolean; hasSchedule: boolean }[]>`
    SELECT d.id, d.name, d.active, EXISTS (SELECT 1 FROM weekly_schedules w WHERE w.doctor_id = d.id) AS has_schedule
    FROM doctors d
    WHERE d.active OR EXISTS (
      SELECT 1 FROM appointments a WHERE a.doctor_id = d.id
        AND tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(${rangeStart}, ${rangeEnd}, '[)'))
    ORDER BY d.active DESC, d.sort_order, d.name
  `;
  const doctorId = input.doctorId && doctorRows.some((d) => d.id === input.doctorId) ? input.doctorId : null;
  const shownDoctors = doctorId ? doctorRows.filter((d) => d.id === doctorId) : doctorRows;

  const rows = await db<
    { id: string; doctorId: string; serviceName: string; patientName: string; status: AppointmentStatus; source: 'online' | 'staff'; startsAt: Date; endsAt: Date }[]
  >`
    SELECT id, doctor_id, service_name_snapshot AS service_name, patient_name, status, source, starts_at, ends_at
    FROM appointments
    WHERE tstzrange(starts_at, ends_at, '[)') && tstzrange(${rangeStart}, ${rangeEnd}, '[)')
      AND (${doctorId}::uuid IS NULL OR doctor_id = ${doctorId}::uuid)
      AND (${input.showCancelled} OR status <> 'cancelled')
    ORDER BY starts_at
  `;
  const nameOf = new Map(doctorRows.map((d) => [d.id, d.name]));

  // Per-dentist working time and absences for the visible dates.
  const contexts = new Map<string, Awaited<ReturnType<typeof loadDayContexts>>>();
  for (const d of shownDoctors) contexts.set(d.id, await loadDayContexts(db, d.id, from, to));

  const toItem = (r: (typeof rows)[number], date: LocalDate): CalendarAppointment => ({
    id: r.id,
    doctorId: r.doctorId,
    doctorName: nameOf.get(r.doctorId) ?? '',
    serviceName: r.serviceName,
    patientName: r.patientName,
    status: r.status,
    source: r.source,
    date,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    startMinute: minuteOfDay(r.startsAt.getTime(), date),
    endMinute: Math.max(minuteOfDay(r.endsAt.getTime(), date), minuteOfDay(r.startsAt.getTime(), date) + 10),
    timeLabel: `${formatLocalTime(r.startsAt.getTime())}–${formatLocalTime(r.endsAt.getTime())}`,
    lane: 0,
    lanes: 1,
  });
  const onDate = (date: LocalDate) => {
    const { start, end } = dayBounds(date);
    return rows.filter((r) => r.startsAt.getTime() < end && r.endsAt.getTime() > start).map((r) => toItem(r, date));
  };

  const dayInfo = (doctor: string, date: LocalDate) => {
    const ctx = contexts.get(doctor)?.get(date);
    if (!ctx) return { working: [] as MinutePeriod[], timeOff: [], closed: null };
    const { start, end } = dayBounds(date);
    const timeOff = (ctx.timeOffEntries ?? [])
      .filter((t) => t.start < end && t.end > start)
      .map((t) => ({ startMinute: minuteOfDay(t.start, date), endMinute: minuteOfDay(t.end, date), reason: t.reason, note: t.note }));
    const closed = ctx.clinicOverride?.kind === 'closed' ? { note: ctx.clinicOverride.note ?? null } : null;
    return { working: workingPeriods(ctx), timeOff, closed };
  };

  let columns: CalendarColumn[];
  if (input.view === 'day') {
    const items = onDate(input.date);
    // Dentists with nothing to show that day (no hours, no appointments) are still listed when active.
    columns = shownDoctors
      .filter((d) => d.active || items.some((i) => i.doctorId === d.id))
      .map((d) => ({
        key: d.id,
        date: input.date,
        doctorId: d.id,
        title: d.name,
        ...dayInfo(d.id, input.date),
        appointments: layoutLanes(items.filter((i) => i.doctorId === d.id)),
      }));
  } else {
    columns = dates.map((date) => {
      const single = doctorId ? dayInfo(doctorId, date) : null;
      return {
        key: date,
        date,
        doctorId,
        title: date,
        working: single ? single.working : null,
        timeOff: single ? single.timeOff : [],
        closed: single ? single.closed : null,
        appointments: layoutLanes(onDate(date)),
      };
    });
  }

  // Visible hours: 08–18 by default, widened to fit working time and appointments.
  let minMinute = 8 * 60;
  let maxMinute = 18 * 60;
  for (const c of columns) {
    for (const p of c.working ?? []) {
      minMinute = Math.min(minMinute, p.startMinute);
      maxMinute = Math.max(maxMinute, p.endMinute);
    }
    for (const a of c.appointments) {
      minMinute = Math.min(minMinute, a.startMinute);
      maxMinute = Math.max(maxMinute, a.endMinute);
    }
  }
  const hourStart = Math.max(0, Math.floor(minMinute / 60));
  const hourEnd = Math.min(24, Math.ceil(maxMinute / 60));

  const agenda = dates.map((date) => ({
    date,
    items: onDate(date).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    working: shownDoctors
      .filter((d) => d.active)
      .map((d) => ({ doctorName: d.name, periods: dayInfo(d.id, date).working })),
  }));

  return {
    view: input.view,
    date: input.date,
    from,
    to,
    today,
    doctors: doctorRows,
    doctorId,
    showCancelled: input.showCancelled,
    columns,
    hourStart,
    hourEnd,
    nowMinute: today >= from && today <= to ? localMinuteOf(input.now) : null,
    agenda,
  };
}
