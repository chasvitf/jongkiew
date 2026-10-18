// node --test test/  (Node 23+ runs TypeScript directly)
import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingCode, freeSlots, freeSlotsAnyStaff, stats, toCsv, toIcs, validPhone, type Booking, type Settings } from "../src/lib/booking.ts";

const settings: Settings = {
  shopName: "ร้านทดสอบ", slotStep: 15, leadMinutes: 30, daysAhead: 14,
  week: [null, { open: 600, close: 1200 }, { open: 600, close: 1200 }, null, { open: 600, close: 1200 }, { open: 600, close: 1200 }, { open: 540, close: 1080 }],
  breaks: [{ start: 720, end: 780 }],
};
const cut = { id: "cut", name: "ตัดผม", minutes: 30, price: 250 };
const color = { id: "color", name: "ทำสี", minutes: 90, price: 900 };
const book = (start: number, minutes: number, staffId = "a", status: Booking["status"] = "booked"): Booking => ({
  code: "X", serviceId: "cut", staffId, date: "2026-10-20", start, minutes, price: 250, name: "n", phone: "0800000000", note: "", status, createdAt: 0,
});
const morning = new Date(2026, 9, 19, 9, 0);   // Monday 19 Oct, the day before

test("open day, closed day, lunch break", () => {
  const slots = freeSlots("2026-10-20", cut, "a", [], settings, morning);   // Tuesday
  assert.equal(slots[0], 600);
  assert.equal(slots.at(-1), 1170);                     // 19:30 + 30 min = closing time
  assert.ok(!slots.includes(705) && !slots.includes(720) && !slots.includes(765));   // nothing that touches 12:00-13:00
  assert.ok(slots.includes(690) && slots.includes(780));
  assert.deepEqual(freeSlots("2026-10-21", cut, "a", [], settings, morning), []);   // Wednesday closed
});

test("existing bookings block overlapping times, cancelled ones do not", () => {
  const slots = freeSlots("2026-10-20", color, "a", [book(660, 30)], settings, morning);
  assert.ok(!slots.includes(600));                      // 10:00-11:30 would hit 11:00
  assert.ok(slots.includes(780));
  const again = freeSlots("2026-10-20", cut, "a", [book(660, 30, "a", "cancelled")], settings, morning);
  assert.ok(again.includes(660));
});

test("today: nothing in the past or inside the lead time", () => {
  const now = new Date(2026, 9, 20, 14, 5);            // Tuesday 14:05
  const slots = freeSlots("2026-10-20", cut, "a", [], settings, now);
  assert.equal(slots[0], 885);                          // 14:45 (14:05 + 30 min, next 15-min step)
});

test("any staff: picks whoever is free, least busy first", () => {
  const staff = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
  const res = freeSlotsAnyStaff("2026-10-20", cut, staff, [book(600, 30, "a"), book(630, 30, "b")], settings, morning);
  assert.equal(res.find((r) => r.start === 600)?.staffId, "b");
  assert.equal(res.find((r) => r.start === 630)?.staffId, "a");
});

test("codes, phones, stats, exports", () => {
  assert.match(bookingCode(), /^[A-HJ-NP-Z2-9]{6}$/);
  assert.ok(validPhone("081-234-5678") && validPhone("02 123 4567") && !validPhone("12345"));
  const s = stats([book(600, 30, "a", "done"), book(630, 30, "a", "noshow"), book(660, 30, "a", "cancelled"), book(700, 30)]);
  assert.deepEqual(s, { bookings: 3, revenue: 250, noshowRate: 0.5, cancelled: 1 });
  const csv = toCsv([{ ...book(600, 30), note: 'มี "จุลภาค", ด้วย' }], [cut], [{ id: "a", name: "ช่างเอ" }]);
  assert.ok(csv.startsWith("﻿รหัสจอง"));
  assert.ok(csv.includes('"มี ""จุลภาค"", ด้วย"'));
  assert.ok(toIcs(book(600, 30), "ตัดผม", "ร้าน").includes("DTSTART;TZID=Asia/Bangkok:20261020T100000"));
});
