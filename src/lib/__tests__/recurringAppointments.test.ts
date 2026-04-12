import { describe, it, expect } from "vitest";

// Extracted from src/hooks/useData.ts for testability
function generateRecurringAppointments(rule: any, userId: string) {
  const appointments: any[] = [];
  const [sy, sm, sd] = (rule.start_date as string).split("-").map(Number);
  const startDate = new Date(Date.UTC(sy, sm - 1, sd));
  const endDate = rule.end_date
    ? (() => { const [ey, em, ed] = (rule.end_date as string).split("-").map(Number); return new Date(Date.UTC(ey, em - 1, ed)); })()
    : null;
  const maxDate = endDate || new Date(Date.UTC(sy, 11, 31));
  const daysOfWeek: number[] = rule.days_of_week || [1];

  let currentWeekStart = new Date(startDate);
  const dayOfWeek = currentWeekStart.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + mondayOffset);

  const [h, m] = (rule.time || "09:00").split(":").map(Number);

  while (currentWeekStart <= maxDate) {
    for (const dow of daysOfWeek) {
      const aptDate = new Date(currentWeekStart);
      aptDate.setUTCDate(aptDate.getUTCDate() + (dow - 1));
      if (aptDate < startDate || aptDate > maxDate) continue;

      aptDate.setUTCHours(h, m, 0, 0);

      appointments.push({
        user_id: userId,
        client_id: rule.client_id,
        service_id: rule.service_id,
        scheduled_at: aptDate.toISOString(),
        duration_minutes: rule.duration_minutes,
        price: rule.price,
        notes: rule.notes || null,
        recurring_rule_id: rule.id,
      });
    }
    currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + (rule.interval_weeks || 1) * 7);
  }
  return appointments;
}

describe("generateRecurringAppointments", () => {
  const baseRule = {
    id: "rule-1",
    client_id: "client-1",
    service_id: "service-1",
    duration_minutes: 60,
    price: 50,
    time: "09:00",
    days_of_week: [2], // Tuesday
    interval_weeks: 1,
    notes: null,
  };

  it("defaults to end of year when no end_date", () => {
    const rule = { ...baseRule, start_date: "2026-04-07", end_date: null };
    const apts = generateRecurringAppointments(rule, "user-1");

    // Should have appointments from April 7 through Dec 31, 2026
    expect(apts.length).toBeGreaterThan(30); // ~38 Tuesdays remaining

    // Last appointment should be on or before Dec 31
    const lastDate = new Date(apts[apts.length - 1].scheduled_at);
    expect(lastDate.getUTCFullYear()).toBe(2026);
    expect(lastDate.getUTCMonth()).toBe(11); // December
    expect(lastDate.getUTCDate()).toBeLessThanOrEqual(31);
  });

  it("respects user-specified end_date", () => {
    const rule = { ...baseRule, start_date: "2026-04-07", end_date: "2026-05-05" };
    const apts = generateRecurringAppointments(rule, "user-1");

    // Only Tuesdays: Apr 7, 14, 21, 28, May 5 = 5 appointments
    expect(apts).toHaveLength(5);

    // All within range
    for (const apt of apts) {
      const d = new Date(apt.scheduled_at);
      expect(d >= new Date("2026-04-07T00:00:00Z")).toBe(true);
      expect(d <= new Date("2026-05-05T23:59:59Z")).toBe(true);
    }
  });

  it("places sessions on the correct day of week (no day-shift)", () => {
    const rule = { ...baseRule, start_date: "2026-04-07", end_date: "2026-04-14" };
    const apts = generateRecurringAppointments(rule, "user-1");

    for (const apt of apts) {
      const d = new Date(apt.scheduled_at);
      // Tuesday = 2 in JS getUTCDay()
      expect(d.getUTCDay()).toBe(2);
    }
  });

  it("sets time in UTC correctly", () => {
    const rule = { ...baseRule, start_date: "2026-04-07", end_date: "2026-04-07", time: "14:30" };
    const apts = generateRecurringAppointments(rule, "user-1");

    expect(apts).toHaveLength(1);
    const d = new Date(apts[0].scheduled_at);
    expect(d.getUTCHours()).toBe(14);
    expect(d.getUTCMinutes()).toBe(30);
  });
});
