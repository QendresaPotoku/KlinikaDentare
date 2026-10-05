/**
 * Staff booking / rescheduling wizard. Shows what the server's booking engine returns; the server
 * re-validates everything on submit (overlaps are never allowed, rule overrides need confirmation).
 */
import { clinicDate, clinicTime, errorMessage, formatDateLong, genericError, periodsLabel } from '../admin/strings';
import { normalizeTime } from './admin-periods';

interface Service {
  id: string;
  name: string;
  durationMin: number;
  onlineVisible: boolean;
  doctorIds: string[];
}
interface Doctor {
  id: string;
  name: string;
  acceptsOnline: boolean;
  hasSchedule: boolean;
}
interface Boot {
  mode: 'new' | 'reschedule';
  today: string;
  services?: Service[];
  doctors: Doctor[];
  countries?: { code: string; dial: string }[];
  appointment?: {
    id: string;
    version: number;
    serviceId: string;
    serviceName: string;
    doctorId: string;
    doctorName: string;
    startsAt: string;
    endsAt: string;
    patientName: string;
  };
}
interface Issue {
  code: string;
  text: string;
}
interface Slot {
  startsAt: string;
  time: string;
  issues: Issue[];
}
type Step = 'service' | 'doctor' | 'time' | 'patient' | 'review';

const STEP_LABEL: Record<Step, string> = {
  service: 'Shërbimi',
  doctor: 'Dentisti',
  time: 'Data dhe ora',
  patient: 'Pacienti',
  review: 'Konfirmimi',
};
const ZONE = 'Europe/Belgrade';

class ApiError extends Error {
  code: string;
  body: Record<string, unknown>;
  constructor(code: string, body: Record<string, unknown> = {}) {
    super(code);
    this.code = code;
    this.body = body;
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, credentials: 'same-origin', headers: { accept: 'application/json', ...init?.headers } });
  } catch {
    throw new ApiError('network');
  }
  let body: Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    /* keep empty */
  }
  if (!res.ok) throw new ApiError(String(body.error ?? (res.status === 401 ? 'unauthorized' : 'server_error')), body);
  return body as T;
}

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** UTC instant (ISO) of a Kosovo wall-clock time, DST-safe. */
function kosovoToIso(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wanted = Date.UTC(y, m - 1, d, hh, mm);
  const offsetAt = (ms: number) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(ms));
    const get = (t: string) => Number(parts.find((p) => p.type === t)!.value) % (t === 'hour' ? 24 : 1e9);
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')) - ms;
  };
  let guess = wanted - offsetAt(wanted);
  guess = wanted - offsetAt(guess);
  return new Date(guess).toISOString();
}

export function startWizard(root: HTMLElement) {
  const boot: Boot = JSON.parse(root.querySelector('[data-wiz-boot]')!.textContent || '{}');
  const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const steps: Step[] = boot.mode === 'reschedule' ? ['doctor', 'time', 'review'] : ['service', 'doctor', 'time', 'patient', 'review'];
  const current = boot.appointment;

  const state = {
    step: steps[0],
    serviceId: current?.serviceId ?? (null as string | null),
    doctorId: current?.doctorId ?? (null as string | null),
    date: current ? clinicDate(current.startsAt) : boot.today,
    slots: [] as Slot[],
    slot: null as Slot | null,
    working: '' as string,
    busy: false,
    seq: 0,
  };
  if (current && state.date < boot.today) state.date = boot.today;

  const el = {
    steps: q('[data-wiz-steps]'),
    alert: q('[data-wiz-alert]'),
    services: root.querySelector<HTMLElement>('[data-wiz-services]'),
    doctors: q('[data-wiz-doctors]'),
    date: q<HTMLInputElement>('[data-wiz-date]'),
    dayLabel: q('[data-wiz-day-label]'),
    hours: q('[data-wiz-hours]'),
    free: q('[data-wiz-free]'),
    freeEmpty: q('[data-wiz-free-empty]'),
    outsideWrap: q<HTMLDetailsElement>('[data-wiz-outside-wrap]'),
    outsideSummary: q('[data-wiz-outside-summary]'),
    outside: q('[data-wiz-outside]'),
    customTime: q<HTMLInputElement>('[data-wiz-custom-time]'),
    picked: q('[data-wiz-picked]'),
    patient: root.querySelector<HTMLFormElement>('[data-wiz-patient]'),
    country: root.querySelector<HTMLSelectElement>('[data-wiz-country]'),
    summary: q('[data-wiz-summary]'),
    override: q('[data-wiz-override]'),
    issues: q('[data-wiz-issues]'),
    overrideCheck: q<HTMLInputElement>('[data-wiz-override-check]'),
    back: q<HTMLButtonElement>('[data-wiz-back]'),
    next: q<HTMLButtonElement>('[data-wiz-next]'),
  };

  const service = () => boot.services?.find((s) => s.id === state.serviceId) ?? null;
  const doctor = () => boot.doctors.find((d) => d.id === state.doctorId) ?? null;
  const doctorsForService = () =>
    boot.mode === 'reschedule' ? boot.doctors : boot.doctors.filter((d) => service()?.doctorIds.includes(d.id));

  function alert(text: string | null, html = false) {
    el.alert.hidden = !text;
    if (html) el.alert.innerHTML = text ?? '';
    else el.alert.textContent = text ?? '';
  }

  function handleError(err: unknown) {
    const code = err instanceof ApiError ? err.code : 'network';
    if (code === 'unauthorized') {
      const next = encodeURIComponent(location.pathname + location.search);
      alert(`${errorMessage.unauthorized} <a class="adm-link" href="/admin/login/?next=${next}&expired=1">Kyçu</a>`, true);
      return;
    }
    alert(errorMessage[code] ?? genericError);
  }

  function show(step: Step) {
    state.step = step;
    root.querySelectorAll<HTMLElement>('[data-step]').forEach((s) => (s.hidden = s.dataset.step !== step));
    const index = steps.indexOf(step);
    el.steps.replaceChildren(
      ...steps.map((s, i) => {
        const li = document.createElement('li');
        li.textContent = STEP_LABEL[s];
        if (i === index) li.setAttribute('aria-current', 'step');
        if (i < index) li.className = 'is-done';
        return li;
      }),
    );
    el.back.hidden = index === 0;
    el.next.hidden = step !== 'patient' && step !== 'review' && !(step === 'doctor' && boot.mode === 'reschedule' && state.doctorId);
    el.next.textContent = step === 'review' ? (boot.mode === 'reschedule' ? 'Zhvendos terminin' : 'Krijo terminin') : 'Vazhdo';
    root.querySelector<HTMLElement>(`[data-step="${step}"] .wiz-title`)?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }

  function choice(label: string, meta: string[], selected: boolean, onPick: () => void) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'adm-choice';
    b.setAttribute('aria-pressed', String(selected));
    const name = document.createElement('span');
    name.textContent = label;
    const m = document.createElement('span');
    m.className = 'adm-choice-meta';
    for (const t of meta) {
      const c = document.createElement('span');
      c.className = 'chip chip--plain';
      c.textContent = t;
      m.append(c);
    }
    b.append(name, m);
    b.addEventListener('click', onPick);
    return b;
  }

  // ---------------------------------------------------------------- service and dentist

  function renderServices() {
    if (!el.services) return;
    const list = boot.services ?? [];
    if (list.length === 0) {
      el.services.innerHTML =
        '<p class="adm-notice adm-notice--quiet">Nuk ka shërbime aktive me dentist të caktuar. Shërbimet dhe dentistët duhet të konfigurohen fillimisht.</p>';
      return;
    }
    el.services.replaceChildren(
      ...list.map((s) =>
        choice(s.name, [`${s.durationMin} min`, ...(s.onlineVisible ? [] : ['jo online'])], s.id === state.serviceId, () => {
          if (state.serviceId !== s.id) {
            state.serviceId = s.id;
            if (!s.doctorIds.includes(state.doctorId ?? '')) state.doctorId = null;
            state.slot = null;
          }
          renderDoctors();
          show('doctor');
        }),
      ),
    );
  }

  function renderDoctors() {
    const list = doctorsForService();
    if (list.length === 0) {
      el.doctors.innerHTML = '<p class="adm-notice adm-notice--quiet">Asnjë dentist aktiv nuk e ofron këtë shërbim.</p>';
      return;
    }
    el.doctors.replaceChildren(
      ...list.map((d) =>
        choice(
          d.name,
          [...(d.id === current?.doctorId ? ['aktual'] : []), ...(d.hasSchedule ? [] : ['pa orar të konfiguruar'])],
          d.id === state.doctorId,
          () => {
            if (state.doctorId !== d.id) state.slot = null;
            state.doctorId = d.id;
            show('time');
            void loadSlots();
          },
        ),
      ),
    );
  }

  // ---------------------------------------------------------------- date and time

  async function loadSlots() {
    const seq = ++state.seq;
    el.date.value = state.date;
    el.date.min = boot.today;
    el.dayLabel.textContent = formatDateLong(state.date);
    el.hours.textContent = 'Duke ngarkuar…';
    el.free.replaceChildren();
    el.outside.replaceChildren();
    el.freeEmpty.hidden = true;
    el.outsideWrap.hidden = true;
    const params = new URLSearchParams({ doctorId: state.doctorId!, date: state.date });
    if (boot.mode === 'reschedule') params.set('appointmentId', current!.id);
    else params.set('serviceId', state.serviceId!);
    try {
      const res = await api<{ slots: Slot[]; working: { startMinute: number; endMinute: number }[]; hasWeeklySchedule: boolean }>(
        `/admin/api/slots/?${params}`,
      );
      if (seq !== state.seq) return;
      state.slots = res.slots;
      const name = doctor()?.name ?? '';
      el.hours.textContent = !res.hasWeeklySchedule
        ? `${name} nuk ka ende orar pune të konfiguruar.`
        : res.working.length
          ? `Orari i ${name}: ${periodsLabel(res.working)}`
          : `${name} nuk punon në këtë ditë.`;
      renderSlots();
    } catch (err) {
      if (seq !== state.seq) return;
      el.hours.textContent = '';
      handleError(err);
    }
  }

  function timeButton(slot: Slot) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `adm-time${slot.issues.length ? ' adm-time--outside' : ''}`;
    b.textContent = slot.time;
    b.setAttribute('aria-pressed', String(slot.startsAt === state.slot?.startsAt));
    if (slot.issues.length) b.title = slot.issues.map((i) => i.text).join(' ');
    b.addEventListener('click', () => pick(slot));
    return b;
  }

  function renderSlots() {
    const free = state.slots.filter((s) => s.issues.length === 0);
    // Outside times: only a sensible daytime range, so the list stays short.
    const outside = state.slots.filter((s) => s.issues.length > 0 && s.time >= '07:00' && s.time <= '21:00');
    el.free.replaceChildren(...free.map(timeButton));
    el.freeEmpty.hidden = free.length > 0;
    el.outsideWrap.hidden = outside.length === 0;
    el.outsideSummary.textContent = `Orare jashtë disponueshmërisë normale (${outside.length})`;
    el.outside.replaceChildren(...outside.map(timeButton));
    renderPicked();
  }

  function renderPicked() {
    el.picked.hidden = !state.slot;
    if (!state.slot) return;
    el.picked.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = `${formatDateLong(clinicDate(state.slot.startsAt))}, ${clinicTime(state.slot.startsAt)}`;
    el.picked.append('Zgjedhur: ', strong);
    for (const i of state.slot.issues) {
      const s = document.createElement('span');
      s.className = 'issue';
      s.textContent = i.text;
      el.picked.append(s);
    }
  }

  function pick(slot: Slot) {
    state.slot = slot;
    alert(null);
    renderSlots();
    if (boot.mode === 'reschedule') goReview();
    else show('patient');
  }

  // ---------------------------------------------------------------- patient

  function fillCountries() {
    if (!el.country || !boot.countries) return;
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames(['sq'], { type: 'region' });
    } catch {
      names = null;
    }
    const nameOf = (c: string) => (c === 'XK' ? 'Kosovë' : (names?.of(c) ?? c));
    const top = ['XK', 'DE', 'AT', 'CH'];
    const sorted = [...boot.countries].sort((a, b) => nameOf(a.code).localeCompare(nameOf(b.code), 'sq'));
    for (const c of [...top.map((t) => boot.countries!.find((x) => x.code === t)!).filter(Boolean), null, ...sorted.filter((c) => !top.includes(c.code))]) {
      if (!c) {
        const sep = new Option('──────', '');
        sep.disabled = true;
        el.country.add(sep);
      } else {
        el.country.add(new Option(`+${c.dial} ${nameOf(c.code)}`, c.code));
      }
    }
    el.country.value = 'XK';
  }

  function patientValues() {
    const f = el.patient!;
    const v = (n: string) => ((f.elements.namedItem(n) as HTMLInputElement | null)?.value ?? '').trim();
    return {
      patientName: v('patientName'),
      patientPhone: v('patientPhone'),
      phoneCountry: el.country?.value || 'XK',
      patientEmail: v('patientEmail'),
      lang: v('lang') || 'sq',
      staffNote: v('staffNote'),
    };
  }

  function setFieldError(name: string, text: string | null) {
    const err = root.querySelector<HTMLElement>(`[data-err="${name}"]`);
    const input = el.patient?.elements.namedItem(name) as HTMLInputElement | null;
    input?.setAttribute('aria-invalid', String(!!text));
    if (err) {
      err.hidden = !text;
      err.textContent = text ?? '';
    }
  }

  function validatePatient(): boolean {
    const p = patientValues();
    const errors: Record<string, string | null> = {
      patientName: p.patientName.length >= 2 ? null : 'Shkruani emrin dhe mbiemrin.',
      patientPhone: p.patientPhone.replace(/\D/g, '').length >= 5 ? null : 'Shkruani një numër telefoni.',
      patientEmail: !p.patientEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.patientEmail) ? null : 'Email-i nuk është i saktë.',
    };
    for (const [k, v] of Object.entries(errors)) setFieldError(k, v);
    const first = Object.entries(errors).find(([, v]) => v)?.[0];
    if (first) (el.patient!.elements.namedItem(first) as HTMLInputElement).focus();
    return !first;
  }

  // ---------------------------------------------------------------- review and submit

  function row(label: string, value: string, was?: string) {
    const div = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    if (was && was !== value) {
      const w = document.createElement('span');
      w.className = 'was';
      w.textContent = was;
      dd.append(w);
    }
    dd.append(value);
    div.append(dt, dd);
    return div;
  }

  function goReview(issues?: Issue[]) {
    const s = state.slot!;
    const when = `${formatDateLong(clinicDate(s.startsAt))}, ${clinicTime(s.startsAt)}`;
    const rows: HTMLElement[] = [];
    if (boot.mode === 'reschedule') {
      rows.push(row('Pacienti', current!.patientName));
      rows.push(row('Shërbimi', current!.serviceName));
      rows.push(row('Dentisti', doctor()!.name, current!.doctorName));
      rows.push(row('Koha', when, `${formatDateLong(clinicDate(current!.startsAt))}, ${clinicTime(current!.startsAt)}`));
    } else {
      const p = patientValues();
      rows.push(row('Shërbimi', `${service()!.name} (${service()!.durationMin} min)`));
      rows.push(row('Dentisti', doctor()!.name));
      rows.push(row('Koha', `${when} (ora e Kosovës)`));
      rows.push(row('Pacienti', p.patientName));
      // National numbers are shown internationally without the trunk 0 ("044…" → "+383 44…").
      const dial = el.country?.selectedOptions[0]?.text.split(' ')[0] ?? '';
      rows.push(row('Telefoni', /^(\+|00)/.test(p.patientPhone) ? p.patientPhone : `${dial} ${p.patientPhone.replace(/^0+/, '')}`));
      if (p.patientEmail) rows.push(row('Email-i', p.patientEmail));
      if (p.staffNote) rows.push(row('Shënim', p.staffNote));
    }
    el.summary.replaceChildren(...rows);
    const list = issues ?? s.issues;
    el.override.hidden = list.length === 0;
    el.overrideCheck.checked = false;
    el.issues.replaceChildren(
      ...list.map((i) => {
        const li = document.createElement('li');
        li.textContent = i.text;
        return li;
      }),
    );
    show('review');
  }

  async function submit() {
    if (state.busy) return;
    const needsOverride = !el.override.hidden;
    if (needsOverride && !el.overrideCheck.checked) {
      alert('Konfirmoni që dëshironi ta caktoni terminin jashtë disponueshmërisë normale.');
      el.overrideCheck.focus();
      return;
    }
    state.busy = true;
    el.next.disabled = true;
    el.back.disabled = true;
    alert(null);
    try {
      if (boot.mode === 'reschedule') {
        await api(`/admin/api/appointments/${current!.id}/reschedule/`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            startsAt: state.slot!.startsAt,
            doctorId: state.doctorId,
            allowOutsideWorkingHours: needsOverride,
            expectedVersion: current!.version,
          }),
        });
        location.href = `/admin/appointments/${current!.id}/?done=rescheduled`;
      } else {
        const p = patientValues();
        const res = await api<{ id: string }>('/admin/api/appointments/', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ...p,
            staffNote: p.staffNote || undefined,
            patientEmail: p.patientEmail || undefined,
            doctorId: state.doctorId,
            serviceId: state.serviceId,
            startsAt: state.slot!.startsAt,
            allowOutsideWorkingHours: needsOverride,
          }),
        });
        location.href = `/admin/appointments/${res.id}/?done=created`;
      }
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError('network');
      if (e.code === 'working_rules') {
        // The server found rule problems the screen did not know about (e.g. custom time): ask explicitly.
        state.slot = { ...state.slot!, issues: (e.body.issues as Issue[]) ?? [] };
        goReview(state.slot.issues);
        alert(errorMessage.working_rules);
      } else if (e.code === 'appointment_conflict' || e.code === 'slot_unavailable' || e.code === 'in_past') {
        state.slot = null;
        show('time');
        await loadSlots();
        alert(errorMessage[e.code]);
      } else if (e.code === 'invalid_phone' || e.code === 'invalid_input') {
        if (boot.mode === 'new') {
          show('patient');
          if (e.code === 'invalid_phone') setFieldError('patientPhone', errorMessage.invalid_phone);
          else validatePatient();
        }
        alert(errorMessage[e.code]);
      } else if (e.code === 'concurrent_change') {
        alert(`${errorMessage.concurrent_change} <a class="adm-link" href="/admin/appointments/${current?.id}/">Hap terminin</a>`, true);
      } else {
        handleError(e);
      }
    } finally {
      state.busy = false;
      el.next.disabled = false;
      el.back.disabled = false;
    }
  }

  // ---------------------------------------------------------------- wiring

  el.back.addEventListener('click', () => {
    const i = steps.indexOf(state.step);
    if (i > 0) {
      alert(null);
      show(steps[i - 1]);
      if (steps[i - 1] === 'time') void loadSlots();
    }
  });
  el.next.addEventListener('click', () => {
    if (state.step === 'doctor' && state.doctorId) {
      show('time');
      void loadSlots();
    } else if (state.step === 'patient') {
      if (validatePatient()) goReview();
    } else if (state.step === 'review') {
      void submit();
    }
  });
  el.patient?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (validatePatient()) goReview();
  });
  el.patient?.addEventListener('input', (e) => {
    const n = (e.target as HTMLInputElement).name;
    if (n) setFieldError(n, null);
  });
  const setDate = (d: string) => {
    if (!d || d < boot.today) d = boot.today;
    state.date = d;
    state.slot = null;
    alert(null);
    void loadSlots();
  };
  el.date.addEventListener('change', () => setDate(el.date.value));
  root.querySelectorAll<HTMLButtonElement>('[data-wiz-day]').forEach((b) =>
    b.addEventListener('click', () => setDate(addDays(state.date, Number(b.dataset.wizDay)))),
  );
  q('[data-wiz-today]').addEventListener('click', () => setDate(boot.today));
  q('[data-wiz-custom-use]').addEventListener('click', () => {
    const t = normalizeTime(el.customTime.value);
    el.customTime.value = t;
    if (!/^\d{2}:\d{2}$/.test(t)) {
      el.customTime.focus();
      return;
    }
    const known = state.slots.find((s) => s.time === t);
    // A time not in the list either overlaps an appointment, is in the past, or is off the grid;
    // the server decides and explains on submit.
    pick(known ?? { startsAt: kosovoToIso(state.date, t), time: t, issues: [] });
  });

  fillCountries();
  renderServices();
  renderDoctors();
  show(steps[0]);
}
