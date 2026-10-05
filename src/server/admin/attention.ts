import type { Db } from '../db/client.ts';
import { loadDayContexts } from '../booking/repository.ts';
import { staffCheckFromContexts } from '../booking/availability.ts';
import { localDateOf, type LocalDate } from '../time.ts';
import { explainIssue, type IssueDetail } from '../../admin/strings.ts';

/**
 * "Needs attention": future scheduled appointments that conflict with the clinic's CURRENT
 * configuration. Nothing is stored: the list is derived on every call, so an item disappears as soon
 * as the conflict is resolved (appointment moved/cancelled, or the configuration changed back).
 *
 * The same function powers the conflict warnings on configuration screens: a save is applied inside a
 * transaction, this list is computed, and the save is rolled back unless the new conflicts were
 * acknowledged.
 *
 * Working-rule problems that staff explicitly overrode when booking/moving the appointment (e.g.
 * "book at 12:00 although it is the lunch break") are not reported again.
 */

export type AttentionCode =
  | 'doctor_inactive'
  | 'service_inactive'
  | 'doctor_not_offering_service'
  | 'clinic_closed'
  | 'outside_working_hours'
  | 'doctor_time_off';

export interface AttentionReason {
  code: AttentionCode;
  text: string;
}

export interface AttentionItem {
  id: string;
  startsAt: Date;
  endsAt: Date;
  doctorId: string;
  doctorName: string;
  serviceId: string;
  serviceName: string;
  patientName: string;
  reasons: AttentionReason[];
}

export interface AttentionScope {
  now: number;
  doctorIds?: string[];
  serviceIds?: string[];
}

export async function findAttention(db: Db, scope: AttentionScope): Promise<AttentionItem[]> {
  const doctorIds = scope.doctorIds ?? null;
  const serviceIds = scope.serviceIds ?? null;
  const rows = await db<
    {
      id: string;
      startsAt: Date;
      endsAt: Date;
      doctorId: string;
      doctorName: string;
      doctorActive: boolean;
      serviceId: string;
      serviceName: string;
      serviceActive: boolean;
      offers: boolean;
      patientName: string;
      overridden: string[] | null;
    }[]
  >`
    SELECT a.id, a.starts_at, a.ends_at, a.doctor_id, d.name AS doctor_name, d.active AS doctor_active,
           a.service_id, s.name_sq AS service_name, s.active AS service_active,
           EXISTS (SELECT 1 FROM doctor_services ds WHERE ds.doctor_id = a.doctor_id AND ds.service_id = a.service_id) AS offers,
           a.patient_name,
           (SELECT e.details -> 'overriddenIssues' FROM appointment_events e
             WHERE e.appointment_id = a.id AND e.type IN ('created', 'rescheduled')
             ORDER BY e.created_at DESC, e.id DESC LIMIT 1) AS overridden
    FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    JOIN services s ON s.id = a.service_id
    WHERE a.status = 'scheduled' AND a.starts_at > ${new Date(scope.now)}
      AND (${doctorIds}::uuid[] IS NULL OR a.doctor_id = ANY(${doctorIds}::uuid[]))
      AND (${serviceIds}::uuid[] IS NULL OR a.service_id = ANY(${serviceIds}::uuid[]))
    ORDER BY a.starts_at
  `;
  if (rows.length === 0) return [];

  // Load each dentist's schedule data once, for the whole span of their upcoming appointments.
  const byDoctor = new Map<string, (typeof rows)[number][]>();
  for (const r of rows) byDoctor.set(r.doctorId, [...(byDoctor.get(r.doctorId) ?? []), r]);

  const items: AttentionItem[] = [];
  for (const [doctorId, list] of byDoctor) {
    const from: LocalDate = localDateOf(list[0].startsAt.getTime());
    const to: LocalDate = localDateOf(Math.max(...list.map((r) => r.endsAt.getTime() - 1)));
    const contexts = await loadDayContexts(db, doctorId, from, to);
    for (const r of list) {
      const reasons: AttentionReason[] = [];
      if (!r.doctorActive) reasons.push({ code: 'doctor_inactive', text: `${r.doctorName} nuk është më aktiv/e në sistem.` });
      if (!r.serviceActive) reasons.push({ code: 'service_inactive', text: `Shërbimi “${r.serviceName}” nuk është më aktiv.` });
      else if (!r.offers) reasons.push({ code: 'doctor_not_offering_service', text: `${r.doctorName} nuk e ofron më shërbimin “${r.serviceName}”.` });

      const start = r.startsAt.getTime();
      const end = r.endsAt.getTime();
      const days = [localDateOf(start), localDateOf(end - 1)]
        .filter((d, i, all) => all.indexOf(d) === i)
        .map((d) => contexts.get(d)!)
        .filter(Boolean);
      if (days.length) {
        const overridden = new Set(r.overridden ?? []);
        for (const detail of staffCheckFromContexts(days, start, end, scope.now).details) {
          if (overridden.has(detail.code)) continue;
          reasons.push({ code: detail.code, text: explainIssue(detail as IssueDetail, r.doctorName) });
        }
      }
      if (reasons.length) {
        items.push({
          id: r.id,
          startsAt: r.startsAt,
          endsAt: r.endsAt,
          doctorId: r.doctorId,
          doctorName: r.doctorName,
          serviceId: r.serviceId,
          serviceName: r.serviceName,
          patientName: r.patientName,
          reasons,
        });
      }
    }
  }
  return items.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export async function countAttention(db: Db, now: number): Promise<number> {
  return (await findAttention(db, { now })).length;
}
