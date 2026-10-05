/** Half-open time interval [start, end) in epoch milliseconds. */
export interface Interval {
  start: number;
  end: number;
}

/** Sorts and merges overlapping or touching intervals; drops empty ones. */
export function normalize(list: Interval[]): Interval[] {
  const sorted = list.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

/** Parts of `base` not covered by any interval in `cut`. */
export function subtract(base: Interval[], cut: Interval[]): Interval[] {
  const cuts = normalize(cut);
  const out: Interval[] = [];
  for (const b of normalize(base)) {
    let cursor = b.start;
    for (const c of cuts) {
      if (c.end <= cursor || c.start >= b.end) continue;
      if (c.start > cursor) out.push({ start: cursor, end: c.start });
      cursor = Math.max(cursor, c.end);
      if (cursor >= b.end) break;
    }
    if (cursor < b.end) out.push({ start: cursor, end: b.end });
  }
  return out;
}

export function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const x of normalize(a)) {
    for (const y of normalize(b)) {
      const start = Math.max(x.start, y.start);
      const end = Math.min(x.end, y.end);
      if (end > start) out.push({ start, end });
    }
  }
  return normalize(out);
}

/** True if [start, end) lies entirely inside one of the intervals. */
export function contains(list: Interval[], start: number, end: number): boolean {
  return list.some((i) => i.start <= start && end <= i.end);
}

export function overlapsAny(list: Interval[], start: number, end: number): boolean {
  return list.some((i) => i.start < end && start < i.end);
}
