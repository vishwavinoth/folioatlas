/**
 * FolioAtlas — leaderboard periods (pure, UTC-based, unit-tested).
 *
 * A period is identified by its kind and an anchor date (YYYY-MM-DD); the
 * window is the day / ISO week / month / year containing the anchor.
 */

export const PERIODS = ["daily", "weekly", "monthly", "yearly", "all"] as const;
export type Period = (typeof PERIODS)[number];
export const PERIOD_LABELS: Record<Period, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  all: "All time",
};
export const DEFAULT_PERIOD: Period = "weekly";

export const METRICS = ["likes", "views"] as const;
export type Metric = (typeof METRICS)[number];

/** First day with recorded engagement — navigation never goes before it. */
export const ENGAGEMENT_START = "2026-11-11";

const DAY_MS = 86_400_000;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export type Window = { from: Date; to: Date };

export function parsePeriod(raw: string | null | undefined): Period {
  return PERIODS.includes(raw as Period) ? (raw as Period) : DEFAULT_PERIOD;
}

export function parseMetric(raw: string | null | undefined): Metric {
  return raw === "views" ? "views" : "likes";
}

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function formatDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Parse YYYY-MM-DD; invalid, future or pre-launch values are clamped. */
export function parseAnchor(raw: string | null | undefined, now: Date = new Date()): Date {
  const today = startOfUtcDay(now);
  const start = new Date(`${ENGAGEMENT_START}T00:00:00Z`);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return today;
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || formatDay(parsed) !== raw) return today;
  if (parsed > today) return today;
  if (parsed < start) return start;
  return parsed;
}

export function periodWindow(period: Period, anchor: Date): Window {
  const day = startOfUtcDay(anchor);
  const y = day.getUTCFullYear();
  const m = day.getUTCMonth();
  switch (period) {
    case "daily":
      return { from: day, to: new Date(day.getTime() + DAY_MS) };
    case "weekly": {
      const sinceMonday = (day.getUTCDay() + 6) % 7; // ISO weeks start on Monday
      const from = new Date(day.getTime() - sinceMonday * DAY_MS);
      return { from, to: new Date(from.getTime() + 7 * DAY_MS) };
    }
    case "monthly":
      return { from: new Date(Date.UTC(y, m, 1)), to: new Date(Date.UTC(y, m + 1, 1)) };
    case "yearly":
      return { from: new Date(Date.UTC(y, 0, 1)), to: new Date(Date.UTC(y + 1, 0, 1)) };
    case "all":
      return { from: new Date(`${ENGAGEMENT_START}T00:00:00Z`), to: new Date(Date.UTC(9999, 0, 1)) };
  }
}

/** Anchor of the previous/next period (the first day of that window). */
export function shiftAnchor(period: Period, anchor: Date, direction: -1 | 1): Date {
  const { from, to } = periodWindow(period, anchor);
  if (direction === 1) return to;
  return periodWindow(period, new Date(from.getTime() - DAY_MS)).from;
}

/** Whether there is an earlier period that can contain engagement. */
export function hasPrevious(period: Period, anchor: Date): boolean {
  if (period === "all") return false;
  return periodWindow(period, anchor).from > new Date(`${ENGAGEMENT_START}T00:00:00Z`);
}

/** Whether a later period has started. */
export function hasNext(period: Period, anchor: Date, now: Date = new Date()): boolean {
  if (period === "all") return false;
  return periodWindow(period, anchor).to <= now;
}

const shortDate = (d: Date) => `${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}`;
const longDate = (d: Date) => `${shortDate(d)}, ${d.getUTCFullYear()}`;

/** Human label for the period, relative to now where it reads better. */
export function periodLabel(period: Period, anchor: Date, now: Date = new Date()): string {
  const current = periodWindow(period, now);
  const { from } = periodWindow(period, anchor);
  const isCurrent = from.getTime() === current.from.getTime();
  switch (period) {
    case "daily":
      if (isCurrent) return "Today";
      if (from.getTime() === current.from.getTime() - DAY_MS) return "Yesterday";
      return longDate(from);
    case "weekly":
      if (isCurrent) return "This week";
      if (from.getTime() === current.from.getTime() - 7 * DAY_MS) return "Last week";
      return `Week of ${longDate(from)}`;
    case "monthly":
      return isCurrent ? "This month" : `${MONTHS[from.getUTCMonth()]} ${from.getUTCFullYear()}`;
    case "yearly":
      return isCurrent ? "This year" : String(from.getUTCFullYear());
    case "all":
      return "All time";
  }
}

/** Calendar range shown under the label, e.g. "Nov 9 – Nov 15, 2026". */
export function periodRange(period: Period, anchor: Date): string {
  const { from, to } = periodWindow(period, anchor);
  const last = new Date(to.getTime() - DAY_MS);
  switch (period) {
    case "daily":
      return longDate(from);
    case "weekly":
      return from.getUTCFullYear() === last.getUTCFullYear()
        ? `${shortDate(from)} – ${longDate(last)}`
        : `${longDate(from)} – ${longDate(last)}`;
    case "monthly":
      return `${MONTHS[from.getUTCMonth()]} ${from.getUTCFullYear()}`;
    case "yearly":
      return String(from.getUTCFullYear());
    case "all":
      return `Since ${longDate(from)}`;
  }
}

export type StripItem = { label: string; date: string; active: boolean; disabled: boolean };

/**
 * Quick-jump strip (Product Hunt style): the days of the anchor's month for
 * the daily view, the months of the anchor's year for the monthly view.
 */
export function periodStrip(period: Period, anchor: Date, now: Date = new Date()): StripItem[] {
  const start = new Date(`${ENGAGEMENT_START}T00:00:00Z`);
  const today = startOfUtcDay(now);
  const a = startOfUtcDay(anchor);
  if (period === "daily") {
    const y = a.getUTCFullYear();
    const m = a.getUTCMonth();
    const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(Date.UTC(y, m, i + 1));
      return { label: String(i + 1), date: formatDay(d), active: d.getTime() === a.getTime(), disabled: d > today || d < start };
    });
  }
  if (period === "monthly") {
    const y = a.getUTCFullYear();
    return MONTHS.map((name, i) => {
      const first = new Date(Date.UTC(y, i, 1));
      const last = new Date(Date.UTC(y, i + 1, 0));
      return {
        label: name.slice(0, 3),
        date: formatDay(first < start && last >= start ? start : first),
        active: i === a.getUTCMonth(),
        disabled: first > today || last < start,
      };
    });
  }
  return [];
}
