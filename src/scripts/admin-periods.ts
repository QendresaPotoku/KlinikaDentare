/**
 * Working-hours editor (see PeriodsEditor.astro). Plain DOM; writes its state as JSON to the hidden
 * input on every change. Shows simple inline hints for obvious mistakes; the server is the authority.
 */

interface Period {
  start: string;
  end: string;
}
interface Day {
  weekday: number;
  periods: Period[];
}

const DAYS = ['', 'E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte', 'E shtunë', 'E diel'];
const DEFAULT_PERIOD: Period = { start: '08:00', end: '16:00' };

/** "8" → 08:00, "830" → 08:30, "13.30" → 13:30. Unrecognised input is kept as typed (the server reports it). */
export function normalizeTime(value: string): string {
  const v = value.trim().replace(/[.,h]/g, ':');
  const m = /^(\d{1,2})(?::?(\d{2}))?$/.exec(v);
  if (!m) return v;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return v;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function el(tag: string, props: Record<string, unknown> = {}, ...children: (Node | string)[]): HTMLElement {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}
const input = (props: Record<string, unknown>) => el('input', props) as HTMLInputElement;

function problem(periods: Period[]): string | null {
  const sorted = [...periods].sort((a, b) => a.start.localeCompare(b.start));
  for (const p of sorted) if (!p.start || !p.end || p.end <= p.start) return 'Ora e mbarimit duhet të jetë pas orës së fillimit.';
  for (let i = 1; i < sorted.length; i++) if (sorted[i].start < sorted[i - 1].end) return 'Periudhat mbivendosen.';
  return null;
}

function periodsList(periods: Period[], onChange: () => void, label: string) {
  const wrap = el('div', { className: 'sched-periods' });
  const hint = el('small', { className: 'adm-error' });
  const render = () => {
    wrap.replaceChildren();
    periods.forEach((p, i) => {
      const start = input({ type: 'text', value: p.start, inputMode: 'numeric', maxLength: 5, placeholder: '08:00', className: 'time-field' });
      start.dataset.time = '';
      const end = input({ type: 'text', value: p.end, inputMode: 'numeric', maxLength: 5, placeholder: '16:00', className: 'time-field' });
      end.dataset.time = '';
      start.setAttribute('aria-label', `${label}: fillimi i periudhës ${i + 1}`);
      end.setAttribute('aria-label', `${label}: mbarimi i periudhës ${i + 1}`);
      start.addEventListener('change', () => ((p.start = normalizeTime(start.value)), (start.value = p.start), onChange(), check()));
      end.addEventListener('change', () => ((p.end = normalizeTime(end.value)), (end.value = p.end), onChange(), check()));
      const remove = el('button', { type: 'button', className: 'period-remove', textContent: '×', title: 'Hiq periudhën' });
      remove.setAttribute('aria-label', `Hiq periudhën ${i + 1}`);
      remove.addEventListener('click', () => {
        periods.splice(i, 1);
        onChange();
        render();
      });
      wrap.append(el('div', { className: 'period' }, start, el('span', { className: 'period-dash', textContent: '–' }), end, remove));
    });
    const add = el('button', { type: 'button', className: 'adm-link', textContent: '+ Shto periudhë' });
    add.addEventListener('click', () => {
      const last = periods.at(-1);
      // A sensible next period: one hour after the previous ends (e.g. after a lunch break).
      const next = last ? nextPeriod(last) : { ...DEFAULT_PERIOD };
      periods.push(next);
      onChange();
      render();
    });
    wrap.append(el('div', { className: 'sched-tools' }, add), hint);
    check();
  };
  const check = () => {
    const text = problem(periods);
    hint.textContent = text ?? '';
    hint.hidden = !text;
  };
  render();
  return { node: wrap, render };
}

function nextPeriod(last: Period): Period {
  const [h, m] = last.end.split(':').map(Number);
  const startH = Math.min(h + 1, 22);
  const endH = Math.min(startH + 4, 23);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { start: `${pad(startH)}:${pad(m)}`, end: `${pad(endH)}:${pad(m)}` };
}

function mountWeek(root: HTMLElement, field: HTMLInputElement) {
  let parsed: Day[] = [];
  try {
    parsed = JSON.parse(field.value || '[]');
  } catch {
    parsed = [];
  }
  const days: Day[] = Array.from({ length: 7 }, (_, i) => ({
    weekday: i + 1,
    periods: (parsed.find((d) => d.weekday === i + 1)?.periods ?? []).map((p) => ({ ...p })),
  }));
  const save = () => {
    field.value = JSON.stringify(days.filter((d) => d.periods.length));
  };
  const rows: (() => void)[] = [];

  for (const day of days) {
    const row = el('div', { className: 'sched-day' });
    const body = el('div');
    const working = input({ type: 'checkbox', checked: day.periods.length > 0 });
    const render = () => {
      row.classList.toggle('is-off', day.periods.length === 0);
      working.checked = day.periods.length > 0;
      body.replaceChildren();
      if (day.periods.length === 0) {
        body.append(el('p', { className: 'sched-off-label', textContent: 'Pushim (nuk punon)' }));
        return;
      }
      const list = periodsList(day.periods, () => {
        save();
        if (day.periods.length === 0) render();
      }, DAYS[day.weekday]);
      const copyAll = el('button', { type: 'button', className: 'adm-link', textContent: 'Kopjo te të gjitha ditët e punës' });
      copyAll.addEventListener('click', () => {
        for (const other of days) {
          if (other !== day && other.periods.length > 0) other.periods = day.periods.map((p) => ({ ...p }));
        }
        save();
        rows.forEach((r) => r());
      });
      const copyWeekdays = el('button', { type: 'button', className: 'adm-link', textContent: 'Kopjo te e hënë–e premte' });
      copyWeekdays.addEventListener('click', () => {
        for (const other of days) if (other !== day && other.weekday <= 5) other.periods = day.periods.map((p) => ({ ...p }));
        save();
        rows.forEach((r) => r());
      });
      body.append(list.node, el('div', { className: 'sched-tools' }, copyWeekdays, copyAll));
    };
    working.addEventListener('change', () => {
      day.periods = working.checked ? [{ ...DEFAULT_PERIOD }] : [];
      save();
      render();
    });
    const name = el('div', { className: 'sched-name' }, DAYS[day.weekday], el('label', { className: 'adm-check' }, working, el('span', { textContent: 'Ditë pune' })));
    row.append(name, body);
    root.append(row);
    rows.push(render);
    render();
  }
  save();
}

function mountDay(root: HTMLElement, field: HTMLInputElement) {
  let periods: Period[] = [];
  try {
    periods = JSON.parse(field.value || '[]');
  } catch {
    periods = [];
  }
  if (periods.length === 0) periods.push({ ...DEFAULT_PERIOD });
  const save = () => (field.value = JSON.stringify(periods));
  const list = periodsList(periods, save, 'Orari');
  root.append(el('div', { className: 'sched-day sched-day--single' }, el('div', { className: 'sched-name', textContent: 'Orari' }), list.node));
  save();
}

export function mountPeriodsEditors() {
  document.querySelectorAll<HTMLElement>('[data-periods-editor]:not([data-mounted])').forEach((root) => {
    root.dataset.mounted = '1';
    const field = root.querySelector<HTMLInputElement>('[data-periods-value]')!;
    if (root.dataset.mode === 'week') mountWeek(root, field);
    else mountDay(root, field);
  });
}
