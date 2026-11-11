/**
 * FolioAtlas — tests for leaderboard periods and anonymous engagement hashing.
 */
import { describe, test, expect, beforeAll } from "bun:test";
import {
  ENGAGEMENT_START,
  formatDay,
  hasNext,
  hasPrevious,
  parseAnchor,
  parseMetric,
  parsePeriod,
  periodLabel,
  periodRange,
  periodStrip,
  periodWindow,
  shiftAnchor,
} from "../../src/lib/engagement/period";
import { ipHash, isAutomated, visitorHash, VISITOR_ID_RE } from "../../src/lib/engagement/server";

const D = (s: string) => new Date(`${s}T00:00:00Z`);
const NOW = new Date("2026-11-18T15:30:00Z"); // a Wednesday
const day = (d: Date) => formatDay(d);

describe("periodWindow (UTC)", () => {
  test("daily covers one UTC day", () => {
    const w = periodWindow("daily", new Date("2026-11-18T23:59:00Z"));
    expect(day(w.from)).toBe("2026-11-18");
    expect(day(w.to)).toBe("2026-11-19");
  });

  test("weekly is an ISO week starting Monday", () => {
    const w = periodWindow("weekly", D("2026-11-18"));
    expect(day(w.from)).toBe("2026-11-16");
    expect(day(w.to)).toBe("2026-11-23");
    expect(day(periodWindow("weekly", D("2026-11-22")).from)).toBe("2026-11-16"); // Sunday
    expect(day(periodWindow("weekly", D("2026-11-23")).from)).toBe("2026-11-23"); // Monday
  });

  test("monthly and yearly use calendar boundaries", () => {
    const m = periodWindow("monthly", D("2026-02-14"));
    expect([day(m.from), day(m.to)]).toEqual(["2026-02-01", "2026-03-01"]);
    const y = periodWindow("yearly", D("2026-12-31"));
    expect([day(y.from), day(y.to)]).toEqual(["2026-01-01", "2027-01-01"]);
  });

  test("all time starts at launch", () => {
    expect(day(periodWindow("all", NOW).from)).toBe(ENGAGEMENT_START);
  });
});

describe("navigation", () => {
  test("shiftAnchor moves one period", () => {
    expect(day(shiftAnchor("daily", D("2026-11-18"), -1))).toBe("2026-11-17");
    expect(day(shiftAnchor("weekly", D("2026-11-18"), -1))).toBe("2026-11-09");
    expect(day(shiftAnchor("monthly", D("2026-12-15"), 1))).toBe("2027-01-01");
    expect(day(shiftAnchor("monthly", D("2026-03-31"), -1))).toBe("2026-02-01");
  });

  test("never navigates before launch or into the future", () => {
    expect(hasPrevious("daily", D(ENGAGEMENT_START))).toBe(false);
    expect(hasPrevious("daily", D("2026-11-12"))).toBe(true);
    expect(hasPrevious("weekly", D(ENGAGEMENT_START))).toBe(false);
    expect(hasNext("daily", D("2026-11-18"), NOW)).toBe(false);
    expect(hasNext("daily", D("2026-11-17"), NOW)).toBe(true);
    expect(hasNext("all", D("2026-11-17"), NOW)).toBe(false);
  });

  test("parseAnchor clamps invalid, future and pre-launch dates", () => {
    expect(day(parseAnchor("2026-11-15", NOW))).toBe("2026-11-15");
    expect(day(parseAnchor("2030-01-01", NOW))).toBe("2026-11-18");
    expect(day(parseAnchor("2020-01-01", NOW))).toBe(ENGAGEMENT_START);
    expect(day(parseAnchor("2026-02-30", NOW))).toBe("2026-11-18");
    expect(day(parseAnchor("junk", NOW))).toBe("2026-11-18");
    expect(day(parseAnchor(null, NOW))).toBe("2026-11-18");
  });

  test("parsePeriod and parseMetric default safely", () => {
    expect(parsePeriod("monthly")).toBe("monthly");
    expect(parsePeriod("hourly")).toBe("weekly");
    expect(parseMetric("views")).toBe("views");
    expect(parseMetric("x")).toBe("likes");
  });
});

describe("labels", () => {
  test("relative labels for current periods", () => {
    expect(periodLabel("daily", D("2026-11-18"), NOW)).toBe("Today");
    expect(periodLabel("daily", D("2026-11-17"), NOW)).toBe("Yesterday");
    expect(periodLabel("daily", D("2026-11-12"), NOW)).toBe("Nov 12, 2026");
    expect(periodLabel("weekly", D("2026-11-18"), NOW)).toBe("This week");
    expect(periodLabel("weekly", D("2026-11-11"), NOW)).toBe("Last week");
    expect(periodLabel("monthly", D("2026-11-02"), NOW)).toBe("This month");
    expect(periodLabel("yearly", D("2026-01-02"), NOW)).toBe("This year");
    expect(periodLabel("all", NOW, NOW)).toBe("All time");
  });

  test("ranges", () => {
    expect(periodRange("weekly", D("2026-11-18"))).toBe("Nov 16 – Nov 22, 2026");
    expect(periodRange("weekly", D("2026-12-30"))).toBe("Dec 28, 2026 – Jan 3, 2027");
    expect(periodRange("monthly", D("2026-11-18"))).toBe("November 2026");
  });

  test("daily strip lists the month's days with future and pre-launch days disabled", () => {
    const strip = periodStrip("daily", D("2026-11-18"), NOW);
    expect(strip).toHaveLength(30);
    expect(strip[17]).toEqual({ label: "18", date: "2026-11-18", active: true, disabled: false });
    expect(strip[9].disabled).toBe(true); // Nov 10, before launch
    expect(strip[18].disabled).toBe(true); // Nov 19, future
    expect(periodStrip("weekly", NOW, NOW)).toEqual([]);
  });
});

describe("anonymous hashing", () => {
  beforeAll(() => {
    process.env.ENGAGEMENT_SALT = "test-salt-0123456789abcdef";
  });

  test("visitor hashes are stable, salted and case-insensitive", () => {
    const vid = "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e";
    expect(visitorHash(vid)).toBe(visitorHash(vid.toUpperCase()));
    expect(visitorHash(vid)).toMatch(/^[0-9a-f]{64}$/);
    expect(visitorHash(vid)).not.toContain(vid.slice(0, 8));
  });

  test("IP hashes rotate daily", () => {
    const a = ipHash("203.0.113.7", new Date("2026-11-18T01:00:00Z"));
    const b = ipHash("203.0.113.7", new Date("2026-11-18T23:00:00Z"));
    const c = ipHash("203.0.113.7", new Date("2026-11-19T01:00:00Z"));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  test("visitor ids must be random v4 UUIDs", () => {
    expect(VISITOR_ID_RE.test("3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e")).toBe(true);
    expect(VISITOR_ID_RE.test("not-a-uuid")).toBe(false);
    expect(VISITOR_ID_RE.test("3f2b8c1e-4d5a-1b6c-8d7e-9f0a1b2c3d4e")).toBe(false); // v1
  });

  test("automated clients are excluded", () => {
    expect(isAutomated(null)).toBe(true);
    expect(isAutomated("Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe(true);
    expect(isAutomated("Mozilla/5.0 HeadlessChrome/120.0")).toBe(true);
    expect(isAutomated("curl/8.5.0")).toBe(true);
    expect(
      isAutomated("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36")
    ).toBe(false);
  });
});
