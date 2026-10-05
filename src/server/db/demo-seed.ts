import type { Sql } from './client.ts';
import { seedInitialData } from './seed.ts';

/**
 * DEMO DATA for local testing only (npm run db:seed:demo). Not used by the server and refused by the
 * script in production: these services, durations and hours are invented examples, not the clinic's.
 *
 * Adds a few online services with dentist assignments and weekly hours, so the booking flow can be
 * tried end to end. It never changes what already exists: services are only added while there are
 * none, and hours only for dentists that have none. Online booking itself is not switched on.
 */
export interface DemoSeedResult {
  doctorsCreated: number;
  servicesCreated: number;
  schedulesCreated: number;
}

type Doctor = 'Dr. Petriti' | 'Dr. Vlera';

const SERVICES: { sq: string; en: string; de: string; duration: number; doctors: Doctor[] }[] = [
  { sq: 'Konsultë', en: 'Consultation', de: 'Beratung', duration: 30, doctors: ['Dr. Petriti', 'Dr. Vlera'] },
  { sq: 'Pastrim profesional i dhëmbëve', en: 'Professional teeth cleaning', de: 'Professionelle Zahnreinigung', duration: 45, doctors: ['Dr. Petriti', 'Dr. Vlera'] },
  { sq: 'Mbushje dentare', en: 'Dental filling', de: 'Zahnfüllung', duration: 45, doctors: ['Dr. Petriti', 'Dr. Vlera'] },
  { sq: 'Konsultë për implant', en: 'Implant consultation', de: 'Implantatberatung', duration: 30, doctors: ['Dr. Petriti'] },
  { sq: 'Heqja e dhëmbit', en: 'Tooth extraction', de: 'Zahnextraktion', duration: 30, doctors: ['Dr. Petriti'] },
  { sq: 'Zbardhimi i dhëmbëve', en: 'Teeth whitening', de: 'Zahnaufhellung', duration: 60, doctors: ['Dr. Vlera'] },
];

const h = (hours: number, minutes = 0) => hours * 60 + minutes;
const WEEKDAYS = [1, 2, 3, 4, 5];

// [weekday (1 = Monday), start minute, end minute]; two periods a day = lunch break in between.
const SCHEDULES: Record<Doctor, [number, number, number][]> = {
  'Dr. Petriti': [
    ...WEEKDAYS.flatMap((d): [number, number, number][] => [[d, h(9), h(13)], [d, h(14), h(18)]]),
    [6, h(9), h(13)],
  ],
  'Dr. Vlera': WEEKDAYS.flatMap((d): [number, number, number][] => [[d, h(8), h(12)], [d, h(13), h(16)]]),
};

export async function seedDemoData(sql: Sql): Promise<DemoSeedResult> {
  const { doctorsCreated } = await seedInitialData(sql);
  return sql.begin(async (tx) => {
    const doctors = await tx<{ id: string; name: string }[]>`SELECT id, name FROM doctors`;
    const idOf = new Map(doctors.map((d) => [d.name, d.id]));

    let servicesCreated = 0;
    const [{ count: existingServices }] = await tx<{ count: number }[]>`SELECT count(*)::int AS count FROM services`;
    if (existingServices === 0) {
      for (const [i, s] of SERVICES.entries()) {
        const [row] = await tx<{ id: string }[]>`
          INSERT INTO services (name_sq, name_en, name_de, duration_min, online_visible, sort_order)
          VALUES (${s.sq}, ${s.en}, ${s.de}, ${s.duration}, true, ${i + 1})
          RETURNING id`;
        for (const name of s.doctors) {
          const doctorId = idOf.get(name);
          if (doctorId) await tx`INSERT INTO doctor_services (doctor_id, service_id) VALUES (${doctorId}, ${row.id})`;
        }
        servicesCreated++;
      }
    }

    let schedulesCreated = 0;
    for (const [name, periods] of Object.entries(SCHEDULES)) {
      const doctorId = idOf.get(name);
      if (!doctorId) continue;
      const [{ count }] = await tx<{ count: number }[]>`
        SELECT count(*)::int AS count FROM weekly_schedules WHERE doctor_id = ${doctorId}`;
      if (count > 0) continue;
      for (const [weekday, start, end] of periods) {
        await tx`
          INSERT INTO weekly_schedules (doctor_id, weekday, start_minute, end_minute)
          VALUES (${doctorId}, ${weekday}, ${start}, ${end})`;
        schedulesCreated++;
      }
    }
    return { doctorsCreated, servicesCreated, schedulesCreated };
  });
}
