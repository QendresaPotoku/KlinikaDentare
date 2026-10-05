/**
 * Booking popup flow: service → dentist → date → time → details → review → success.
 * All data comes from /api/booking/*. The server re-checks everything on submit; the browser only
 * guides the patient. Personal details survive going back and a "slot just taken" bounce.
 */

type Strings = typeof import('../i18n/en').default.booking;

interface Doctor {
  id: string;
  name: string;
}
interface Service {
  id: string;
  name: string;
  durationMin: number;
  doctors: Doctor[];
}
interface Options {
  enabled: true;
  services: Service[];
  emailRequired: boolean;
  window: { from: string; to: string };
  countries: { code: string; dial: string }[];
  defaultCountry: string;
  formToken: string;
}
interface Slot {
  startsAt: string;
  time: string;
}
type StepName = 'loading' | 'closed' | 'service' | 'doctor' | 'date' | 'time' | 'details' | 'review' | 'success';

const FLOW: StepName[] = ['service', 'doctor', 'date', 'time', 'details', 'review'];
const TIME_ZONE = 'Europe/Belgrade';
const PRIORITY_COUNTRIES = ['XK', 'DE', 'AT', 'CH'];
const OPTIONS_MAX_AGE_MS = 10 * 60_000;

class ApiError extends Error {
  code: string;
  status: number;
  fields: { field: string }[];
  constructor(code: string, status: number, fields: { field: string }[] = []) {
    super(code);
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(path, { ...init, signal: controller.signal, headers: { accept: 'application/json', ...init?.headers } });
  } catch {
    throw new ApiError('network', 0);
  } finally {
    window.clearTimeout(timer);
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(res.ok ? 'server_error' : 'network', res.status);
  }
  if (!res.ok) {
    const b = body as { error?: string; fields?: { field: string }[] };
    throw new ApiError(b.error ?? 'server_error', res.status, b.fields);
  }
  return body as T;
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? ''));

function newKey(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function createBookingFlow(dialog: HTMLDialogElement) {
  const lang = dialog.dataset.lang || 'sq';
  const s: Strings = JSON.parse(dialog.querySelector('[data-bk-strings]')!.textContent || '{}');
  const q = <T extends Element = HTMLElement>(sel: string) => dialog.querySelector<T>(sel)!;

  const el = {
    progress: q('[data-bk-progress]'),
    progressLabel: q('[data-bk-progress-label]'),
    progressFill: q('[data-bk-progress-fill]'),
    live: q('[data-bk-live]'),
    alert: q('[data-bk-alert]'),
    closedMessage: q('[data-bk-closed-message]'),
    services: q('[data-bk-services]'),
    doctors: q('[data-bk-doctors]'),
    calendar: q('[data-bk-calendar]'),
    monthLabel: q('[data-bk-month-label]'),
    days: q('[data-bk-days]'),
    noDates: q('[data-bk-no-dates]'),
    noDatesText: q('[data-bk-no-dates-text]'),
    timeDate: q('[data-bk-time-date]'),
    times: q('[data-bk-times]'),
    form: q<HTMLFormElement>('[data-bk-details]'),
    country: q<HTMLSelectElement>('[data-bk-country]'),
    dial: q('[data-bk-dial]'),
    emailOptional: q('[data-bk-email-optional]'),
    summary: q('[data-bk-summary]'),
    successText: q('[data-bk-success-text]'),
    successSms: q('[data-bk-success-sms]'),
    actions: q('[data-bk-actions]'),
    back: q<HTMLButtonElement>('[data-bk-back]'),
    next: q<HTMLButtonElement>('[data-bk-next]'),
    nextLabel: q('[data-bk-next-label]'),
  };

  const state = {
    step: 'loading' as StepName,
    options: null as Options | null,
    optionsLoadedAt: 0,
    serviceId: null as string | null,
    doctorId: null as string | null,
    dates: [] as string[],
    month: '', // 'YYYY-MM'
    date: null as string | null,
    slots: [] as Slot[],
    slot: null as Slot | null,
    detailsDone: false,
    idempotencyKey: newKey(),
    submitting: false,
    loadSeq: 0,
  };

  // ---------------------------------------------------------------- formatting (Kosovo time)

  const dateFmt = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const monthFmt = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const weekdayFmt = new Intl.DateTimeFormat(lang, { weekday: 'short', timeZone: 'UTC' });
  const dateOnly = (d: string) => new Date(`${d}T12:00:00Z`);
  const formatDate = (d: string) => dateFmt.format(dateOnly(d));
  const todayInClinic = () => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());
  const kosovoTime = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TIME_ZONE }).format(new Date(iso));
  const kosovoDate = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(iso));

  const service = () => state.options?.services.find((x) => x.id === state.serviceId) ?? null;
  const doctor = () => service()?.doctors.find((x) => x.id === state.doctorId) ?? null;

  // ---------------------------------------------------------------- UI helpers

  function announce(text: string) {
    el.live.textContent = '';
    window.setTimeout(() => (el.live.textContent = text), 30);
  }

  function showAlert(text: string | null) {
    el.alert.hidden = !text;
    el.alert.textContent = text ?? '';
  }

  function showStep(step: StepName, options: { focus?: boolean } = {}) {
    state.step = step;
    dialog.querySelectorAll<HTMLElement>('[data-bk-step]').forEach((sec) => (sec.hidden = sec.dataset.bkStep !== step));
    const index = FLOW.indexOf(step);
    el.progress.hidden = index < 0;
    if (index >= 0) {
      el.progressLabel.textContent = `${fill(s.stepOf, { n: index + 1, total: FLOW.length })} · ${s.steps[step as keyof Strings['steps']]}`;
      el.progressFill.style.width = `${((index + 1) / FLOW.length) * 100}%`;
    }
    // Footer: Back from step 2 on; Continue only where the step needs it (choices advance on tap).
    el.back.hidden = index <= 0;
    el.next.hidden = step !== 'details' && step !== 'review';
    el.actions.hidden = index < 0 || (el.back.hidden && el.next.hidden);
    el.nextLabel.textContent = step === 'review' ? s.confirm : s.continue;
    dialog.scrollTop = 0;
    if (options.focus !== false) {
      const heading = dialog.querySelector<HTMLElement>(`[data-bk-step="${step}"] .step-title`);
      heading?.focus({ preventScroll: true });
    }
  }

  function setLoading(container: HTMLElement) {
    container.innerHTML = `<p class="muted">${s.loading}</p>`;
    announce(s.loading);
  }

  function errorText(code: string): string {
    const e = s.errors;
    const map: Record<string, string> = {
      network: e.network,
      slot_unavailable: e.slotTaken,
      invalid_phone: e.phone,
      phone_landline: e.landline,
      email_required: e.emailRequired,
      rate_limited: e.rateLimited,
      too_many_bookings: e.tooMany,
      form_expired: e.formExpired,
      too_fast: e.tooFast,
      service_unavailable: e.unavailable,
      doctor_unavailable: e.unavailable,
      doctor_not_offering_service: e.unavailable,
    };
    return map[code] ?? e.generic;
  }

  function choiceButton(label: string, meta: string, selected: boolean, onPick: () => void) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice';
    btn.setAttribute('aria-pressed', String(selected));
    btn.innerHTML = `<span class="choice-name"></span><span class="choice-meta"><span></span>
      <svg viewBox="0 0 22 10" aria-hidden="true"><path d="M0 5h20M16 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.2"/></svg></span>`;
    btn.querySelector('.choice-name')!.textContent = label;
    btn.querySelector('.choice-meta span')!.textContent = meta;
    btn.addEventListener('click', onPick);
    return btn;
  }

  // ---------------------------------------------------------------- options

  async function loadOptions(): Promise<boolean> {
    showAlert(null);
    showStep('loading', { focus: false });
    announce(s.loading);
    try {
      const data = await api<Options | { enabled: false; message: string }>(`/api/booking/options/?lang=${lang}`);
      if (!data.enabled) {
        showClosed(data.message);
        return false;
      }
      state.options = data;
      state.optionsLoadedAt = Date.now();
      // Drop selections that are no longer offered.
      if (!service()) state.serviceId = null;
      if (!doctor()) state.doctorId = null;
      fillCountries(data);
      el.emailOptional.hidden = data.emailRequired;
      return true;
    } catch {
      showClosed(s.errors.load);
      return false;
    }
  }

  function showClosed(message: string) {
    state.options = null;
    el.closedMessage.textContent = message;
    showStep('closed');
  }

  /** Re-fetches options (fresh form token, current services); returns to the service step if a choice vanished. */
  async function refreshAfterUnavailable(code: string) {
    const ok = await loadOptions();
    if (!ok) return;
    renderServices();
    showStep('service');
    showAlert(errorText(code));
  }

  function fillCountries(data: Options) {
    if (el.country.options.length) return;
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([lang], { type: 'region' });
    } catch {
      names = null;
    }
    const nameOf = (code: string) => (code === 'XK' && lang === 'sq' ? 'Kosovë' : names?.of(code) ?? code);
    const byName = (a: { code: string }, b: { code: string }) => nameOf(a.code).localeCompare(nameOf(b.code), lang);
    const top = PRIORITY_COUNTRIES.map((c) => data.countries.find((x) => x.code === c)).filter(Boolean) as Options['countries'];
    const rest = data.countries.filter((c) => !PRIORITY_COUNTRIES.includes(c.code)).sort(byName);
    const add = (c: { code: string; dial: string }) => el.country.add(new Option(`${nameOf(c.code)} (+${c.dial})`, c.code));
    top.forEach(add);
    const sep = new Option('──────────', '');
    sep.disabled = true;
    el.country.add(sep);
    rest.forEach(add);
    el.country.value = data.defaultCountry;
    updateDial();
  }

  function updateDial() {
    const c = state.options?.countries.find((x) => x.code === el.country.value);
    el.dial.textContent = c ? `+${c.dial}` : '+';
  }

  // ---------------------------------------------------------------- steps 1–2: service, dentist

  function renderServices() {
    el.services.replaceChildren(
      ...state.options!.services.map((sv) =>
        choiceButton(sv.name, fill(s.minutes, { n: sv.durationMin }), sv.id === state.serviceId, () => pickService(sv.id)),
      ),
    );
  }

  function pickService(id: string) {
    if (state.serviceId !== id) {
      state.serviceId = id;
      if (!doctor()) state.doctorId = null;
      resetDateAndTime();
    }
    renderDoctors();
    showAlert(null);
    showStep('doctor');
  }

  function renderDoctors() {
    const sv = service()!;
    el.doctors.replaceChildren(
      ...sv.doctors.map((d) => choiceButton(d.name, '', d.id === state.doctorId, () => pickDoctor(d.id))),
    );
  }

  function pickDoctor(id: string) {
    if (state.doctorId !== id) {
      state.doctorId = id;
      resetDateAndTime();
    }
    showAlert(null);
    showStep('date');
    void loadDates();
  }

  function resetDateAndTime() {
    state.dates = [];
    state.date = null;
    state.slot = null;
    state.slots = [];
  }

  // ---------------------------------------------------------------- step 3: date

  async function loadDates(options: { keepAlert?: boolean } = {}) {
    const opts = state.options!;
    const seq = ++state.loadSeq;
    el.calendar.hidden = false;
    el.noDates.hidden = true;
    setLoading(el.days);
    const params = new URLSearchParams({ serviceId: state.serviceId!, doctorId: state.doctorId!, from: opts.window.from, to: opts.window.to });
    try {
      const { dates } = await api<{ dates: string[] }>(`/api/booking/dates/?${params}`);
      if (seq !== state.loadSeq) return;
      state.dates = dates;
      if (state.date && !dates.includes(state.date)) state.date = null;
      if (!options.keepAlert) showAlert(null);
      if (dates.length === 0) {
        el.calendar.hidden = true;
        el.noDates.hidden = false;
        el.noDatesText.textContent = fill(s.noDates, { doctor: doctor()?.name ?? '' });
        announce(el.noDatesText.textContent);
        return;
      }
      state.month = (state.date ?? dates[0]).slice(0, 7);
      renderCalendar();
    } catch (err) {
      if (seq !== state.loadSeq) return;
      handleLoadError(err, () => loadDates());
    }
  }

  function handleLoadError(err: unknown, retry: () => void) {
    const code = err instanceof ApiError ? err.code : 'network';
    if (['service_unavailable', 'doctor_unavailable', 'doctor_not_offering_service'].includes(code)) {
      void refreshAfterUnavailable(code);
      return;
    }
    if (code === 'online_disabled') {
      void loadOptions();
      return;
    }
    showAlert(errorText(code));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--ghost';
    btn.textContent = s.retry;
    btn.addEventListener('click', retry);
    el.alert.append(document.createElement('br'), btn);
  }

  function monthBounds() {
    const opts = state.options!;
    return { min: opts.window.from.slice(0, 7), max: opts.window.to.slice(0, 7) };
  }

  function shiftMonth(delta: number) {
    const [y, m] = state.month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    const next = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const { min, max } = monthBounds();
    if (next < min || next > max) return;
    state.month = next;
    renderCalendar();
  }

  function renderCalendar() {
    const [y, m] = state.month.split('-').map(Number);
    el.monthLabel.textContent = monthFmt.format(new Date(Date.UTC(y, m - 1, 15)));
    const { min, max } = monthBounds();
    q<HTMLButtonElement>('[data-bk-month="-1"]').disabled = state.month <= min;
    q<HTMLButtonElement>('[data-bk-month="1"]').disabled = state.month >= max;

    const available = new Set(state.dates);
    const today = todayInClinic();
    const cells: HTMLElement[] = [];
    // Weekday headers, Monday first (2024-01-01 was a Monday).
    for (let i = 0; i < 7; i++) {
      const wd = document.createElement('span');
      wd.className = 'cal-wd';
      wd.setAttribute('aria-hidden', 'true');
      wd.textContent = weekdayFmt.format(new Date(Date.UTC(2024, 0, 1 + i)));
      cells.push(wd);
    }
    const first = new Date(Date.UTC(y, m - 1, 1));
    const offset = (first.getUTCDay() + 6) % 7;
    for (let i = 0; i < offset; i++) cells.push(document.createElement('span'));
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${state.month}-${String(day).padStart(2, '0')}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-day';
      btn.textContent = String(day);
      btn.setAttribute('aria-label', formatDate(date));
      if (date === today) btn.classList.add('is-today');
      if (available.has(date)) {
        btn.classList.add('is-available');
        btn.setAttribute('aria-pressed', String(date === state.date));
        btn.addEventListener('click', () => pickDate(date));
      } else {
        btn.disabled = true;
      }
      cells.push(btn);
    }
    el.days.replaceChildren(...cells);
  }

  function pickDate(date: string) {
    state.date = date;
    state.slot = null;
    showAlert(null);
    showStep('time');
    void loadSlots();
  }

  // ---------------------------------------------------------------- step 4: time

  async function loadSlots(options: { keepAlert?: boolean } = {}) {
    const seq = ++state.loadSeq;
    el.timeDate.textContent = formatDate(state.date!);
    setLoading(el.times);
    const params = new URLSearchParams({ serviceId: state.serviceId!, doctorId: state.doctorId!, date: state.date! });
    try {
      const { slots } = await api<{ slots: Slot[] }>(`/api/booking/slots/?${params}`);
      if (seq !== state.loadSeq) return;
      state.slots = slots;
      if (slots.length === 0) {
        // The date filled up while the patient was choosing: back to the calendar, refreshed.
        state.date = null;
        showStep('date');
        await loadDates({ keepAlert: true });
        showAlert(s.errors.noTimes);
        return;
      }
      if (!options.keepAlert) showAlert(null);
      renderTimes();
    } catch (err) {
      if (seq !== state.loadSeq) return;
      handleLoadError(err, () => loadSlots());
    }
  }

  function renderTimes() {
    el.times.replaceChildren(
      ...state.slots.map((slot) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'time';
        btn.textContent = slot.time;
        btn.setAttribute('aria-label', `${slot.time}, ${s.kosovoTime}`);
        btn.setAttribute('aria-pressed', String(slot.startsAt === state.slot?.startsAt));
        btn.addEventListener('click', () => pickSlot(slot));
        return btn;
      }),
    );
  }

  function pickSlot(slot: Slot) {
    if (state.slot?.startsAt !== slot.startsAt) state.idempotencyKey = newKey();
    state.slot = slot;
    showAlert(null);
    if (state.detailsDone && validateDetails(false)) {
      renderReview();
      showStep('review');
    } else {
      showStep('details');
    }
  }

  // ---------------------------------------------------------------- step 5: details

  const field = (name: string) => el.form.elements.namedItem(name) as HTMLInputElement;

  function setFieldError(name: string, message: string | null) {
    const input = field(name);
    const err = dialog.querySelector<HTMLElement>(`#bk-err-${name}`);
    input?.setAttribute('aria-invalid', String(!!message));
    if (err) {
      err.hidden = !message;
      err.textContent = message ?? '';
    }
  }

  function details() {
    return {
      patientName: field('patientName').value.trim(),
      patientPhone: field('patientPhone').value.trim(),
      phoneCountry: el.country.value || 'XK',
      patientEmail: field('patientEmail').value.trim(),
      patientNote: (el.form.elements.namedItem('patientNote') as HTMLTextAreaElement).value.trim(),
      consent: field('consent').checked,
      website: field('website').value,
    };
  }

  function validateDetails(show = true): boolean {
    const d = details();
    const errors: Record<string, string | null> = {
      patientName: d.patientName.length >= 2 ? null : s.errors.name,
      patientPhone: /\d{5,}/.test(d.patientPhone.replace(/\D/g, '')) ? null : s.errors.phone,
      patientEmail: d.patientEmail
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.patientEmail)
          ? null
          : s.errors.email
        : state.options?.emailRequired
          ? s.errors.emailRequired
          : null,
      consent: d.consent ? null : s.errors.consent,
    };
    if (show) {
      for (const [name, message] of Object.entries(errors)) setFieldError(name, message);
      const firstInvalid = Object.entries(errors).find(([, m]) => m)?.[0];
      if (firstInvalid) field(firstInvalid).focus();
    }
    return Object.values(errors).every((m) => !m);
  }

  // ---------------------------------------------------------------- step 6: review and submit

  /** "+383 44 123 456" for a national number typed as "044 123 456"; international input shown as typed. */
  function displayPhone(input: string): string {
    if (/^(\+|00)/.test(input)) return input;
    return `${el.dial.textContent} ${input.replace(/^0+/, '')}`;
  }

  function renderReview() {
    const d = details();
    const rows: [string, string, string | null, StepName | null][] = [
      [s.summary.service, service()!.name, fill(s.minutes, { n: service()!.durationMin }), 'service'],
      [s.summary.doctor, doctor()!.name, null, 'doctor'],
      [s.summary.when, `${formatDate(state.date!)}, ${state.slot!.time}`, s.kosovoTime, 'date'],
      [s.summary.patient, d.patientName, null, 'details'],
      [s.summary.phone, displayPhone(d.patientPhone), null, null],
    ];
    if (d.patientEmail) rows.push([s.summary.email, d.patientEmail, null, null]);
    if (d.patientNote) rows.push([s.summary.note, d.patientNote, null, null]);

    el.summary.replaceChildren(
      ...rows.map(([label, value, sub, target]) => {
        const row = document.createElement('div');
        row.className = 'summary-row';
        const dt = document.createElement('dt');
        dt.textContent = label;
        const dd = document.createElement('dd');
        dd.textContent = value;
        if (sub) {
          const small = document.createElement('small');
          small.textContent = sub;
          dd.append(small);
        }
        row.append(dt, dd);
        if (target) {
          const edit = document.createElement('button');
          edit.type = 'button';
          edit.className = 'edit';
          edit.textContent = s.change;
          edit.setAttribute('aria-label', `${s.change}: ${label}`);
          edit.addEventListener('click', () => goTo(target));
          row.append(edit);
        } else {
          row.append(document.createElement('span'));
        }
        return row;
      }),
    );
  }

  function goTo(step: StepName) {
    showAlert(null);
    if (step === 'service') renderServices();
    if (step === 'doctor') renderDoctors();
    showStep(step);
    if (step === 'date') void loadDates();
  }

  async function submit() {
    if (state.submitting) return;
    state.submitting = true;
    el.next.disabled = true;
    el.back.disabled = true;
    el.next.setAttribute('aria-busy', 'true');
    el.nextLabel.textContent = s.confirming;
    announce(s.confirming);
    showAlert(null);

    const d = details();
    try {
      const result = await api<{ smsQueued?: boolean; appointment: { doctorName: string; serviceName: string; startsAt: string; patientPhone: string } }>(
        '/api/booking/',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ...d,
            serviceId: state.serviceId,
            doctorId: state.doctorId,
            startsAt: state.slot!.startsAt,
            lang,
            idempotencyKey: state.idempotencyKey,
            formToken: state.options!.formToken,
          }),
        },
      );
      showSuccess(result.appointment, !!result.smsQueued);
    } catch (err) {
      await handleSubmitError(err instanceof ApiError ? err : new ApiError('network', 0));
    } finally {
      state.submitting = false;
      el.next.disabled = false;
      el.back.disabled = false;
      el.next.removeAttribute('aria-busy');
      if (state.step === 'review') el.nextLabel.textContent = s.confirm;
    }
  }

  async function handleSubmitError(err: ApiError) {
    switch (err.code) {
      case 'slot_unavailable':
        // Keep everything the patient typed; offer the remaining times for the same date.
        state.slot = null;
        showStep('time');
        showAlert(s.errors.slotTaken);
        await loadSlots({ keepAlert: true });
        return;
      case 'invalid_phone':
      case 'phone_landline':
        showStep('details');
        setFieldError('patientPhone', errorText(err.code));
        field('patientPhone').focus();
        return;
      case 'email_required':
        showStep('details');
        setFieldError('patientEmail', s.errors.emailRequired);
        field('patientEmail').focus();
        return;
      case 'invalid_input': {
        const fields = err.fields.map((f) => f.field);
        const target = ['patientName', 'patientPhone', 'patientEmail', 'consent'].find((f) => fields.includes(f));
        if (target) {
          showStep('details');
          validateDetails(true);
          if (target === 'patientEmail') setFieldError('patientEmail', s.errors.email);
          return;
        }
        showAlert(s.errors.generic);
        return;
      }
      case 'form_expired':
      case 'too_fast': {
        // Get a fresh token quietly; the patient just confirms again.
        try {
          const data = await api<Options>(`/api/booking/options/?lang=${lang}`);
          if (data.enabled) state.options = { ...state.options!, formToken: data.formToken };
        } catch {
          /* shown below */
        }
        showAlert(errorText(err.code));
        return;
      }
      case 'idempotency_conflict':
        state.idempotencyKey = newKey();
        showAlert(s.errors.generic);
        return;
      case 'service_unavailable':
      case 'doctor_unavailable':
      case 'doctor_not_offering_service':
        await refreshAfterUnavailable(err.code);
        return;
      case 'online_disabled':
        await loadOptions();
        return;
      default:
        showAlert(errorText(err.code));
    }
  }

  function showSuccess(a: { doctorName: string; serviceName: string; startsAt: string; patientPhone: string }, smsQueued = false) {
    el.successText.textContent = fill(s.successText, {
      service: a.serviceName,
      doctor: a.doctorName,
      date: formatDate(kosovoDate(a.startsAt)),
      time: kosovoTime(a.startsAt),
    });
    // Only says a confirmation WILL be sent: delivery itself is not confirmed at this point.
    el.successSms.hidden = !smsQueued;
    el.successSms.textContent = smsQueued ? fill(s.successSms, { phone: a.patientPhone }) : '';
    showStep('success');
    // A new booking starts fresh next time.
    el.form.reset();
    if (state.options) el.country.value = state.options.defaultCountry;
    updateDial();
    Object.assign(state, { serviceId: null, doctorId: null, date: null, slot: null, slots: [], dates: [], detailsDone: false });
    state.idempotencyKey = newKey();
  }

  // ---------------------------------------------------------------- navigation

  function back() {
    const index = FLOW.indexOf(state.step);
    if (index <= 0) return;
    goTo(FLOW[index - 1]);
    if (FLOW[index - 1] === 'time') void loadSlots();
  }

  function next() {
    if (state.step === 'details') {
      if (!validateDetails(true)) return;
      state.detailsDone = true;
      renderReview();
      showStep('review');
    } else if (state.step === 'review') {
      void submit();
    }
  }

  el.back.addEventListener('click', back);
  el.next.addEventListener('click', next);
  el.form.addEventListener('submit', (e) => {
    e.preventDefault();
    next();
  });
  el.country.addEventListener('change', () => {
    updateDial();
    setFieldError('patientPhone', null);
  });
  el.form.addEventListener('input', (e) => {
    const name = (e.target as HTMLInputElement).name;
    if (name) setFieldError(name, null);
  });
  dialog.querySelectorAll<HTMLButtonElement>('[data-bk-month]').forEach((btn) =>
    btn.addEventListener('click', () => shiftMonth(Number(btn.dataset.bkMonth))),
  );
  dialog.querySelectorAll<HTMLButtonElement>('[data-bk-goto]').forEach((btn) =>
    btn.addEventListener('click', () => goTo(btn.dataset.bkGoto as StepName)),
  );

  return {
    /** Called each time the popup opens: resume where the patient left off, with fresh availability. */
    async onOpen() {
      const resumable = state.options && !['loading', 'closed', 'success'].includes(state.step);
      const fresh = Date.now() - state.optionsLoadedAt < OPTIONS_MAX_AGE_MS;
      if (resumable && fresh) {
        showStep(state.step);
        if (state.step === 'date') void loadDates();
        if (state.step === 'time') void loadSlots();
        return;
      }
      const ok = await loadOptions();
      if (!ok) return;
      renderServices();
      if (resumable && service() && doctor() && state.step !== 'service') {
        // Stale options: keep the patient's choices but re-check the date/time.
        showStep('date');
        void loadDates();
      } else {
        showStep('service');
      }
    },
  };
}
