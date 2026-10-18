// Booking rules with no browser or React code, so test/booking.test.ts runs them in Node.

export type Service = { id: string; name: string; minutes: number; price: number };
export type Staff = { id: string; name: string };
export type Status = "booked" | "arrived" | "done" | "noshow" | "cancelled";
export type Booking = {
  code: string;
  serviceId: string;
  staffId: string;
  date: string;        // YYYY-MM-DD (shop's local date)
  start: number;       // minutes from midnight
  minutes: number;
  price: number;
  name: string;
  phone: string;
  note: string;
  status: Status;
  createdAt: number;
};
export type Hours = { open: number; close: number } | null;   // minutes from midnight, null = closed
export type Settings = {
  shopName: string;
  slotStep: number;               // minutes between start times offered
  week: Hours[];                  // index 0 = Sunday
  breaks: { start: number; end: number }[];  // daily breaks for everyone (lunch)
  leadMinutes: number;            // earliest booking from now
  daysAhead: number;
};

export const STATUS_TH: Record<Status, string> = {
  booked: "จองแล้ว", arrived: "มาถึงแล้ว", done: "เสร็จแล้ว", noshow: "ไม่มาตามนัด", cancelled: "ยกเลิก",
};

/** Bookings that still take up the chair. */
export const blocks = (b: Booking) => b.status !== "cancelled" && b.status !== "noshow";

export const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const overlaps = (a: number, aLen: number, b: number, bLen: number) => a < b + bLen && b < a + aLen;

/**
 * Start times a service can be booked on a date with one staff member.
 * now: current time, so slots in the past (and inside the lead time) are not offered.
 */
export function freeSlots(date: string, service: Service, staffId: string, bookings: Booking[], s: Settings, now: Date): number[] {
  const hours = s.week[parseKey(date).getDay()];
  if (!hours) return [];
  const taken = bookings.filter((b) => b.date === date && b.staffId === staffId && blocks(b));
  const today = dateKey(now) === date;
  const earliest = today ? now.getHours() * 60 + now.getMinutes() + s.leadMinutes : -1;
  const out: number[] = [];
  for (let t = hours.open; t + service.minutes <= hours.close; t += s.slotStep) {
    if (t < earliest) continue;
    if (s.breaks.some((br) => overlaps(t, service.minutes, br.start, br.end - br.start))) continue;
    if (taken.some((b) => overlaps(t, service.minutes, b.start, b.minutes))) continue;
    out.push(t);
  }
  return out;
}

/** "Any staff": a time is free if at least one person is free; returns who gets it (least busy that day first). */
export function freeSlotsAnyStaff(date: string, service: Service, staff: Staff[], bookings: Booking[], s: Settings, now: Date) {
  const load = (id: string) => bookings.filter((b) => b.date === date && b.staffId === id && blocks(b)).length;
  const order = [...staff].sort((a, b) => load(a.id) - load(b.id));
  const byTime = new Map<number, string>();
  for (const p of order) {
    for (const t of freeSlots(date, service, p.id, bookings, s, now)) if (!byTime.has(t)) byTime.set(t, p.id);
  }
  return [...byTime.entries()].sort((a, b) => a[0] - b[0]).map(([start, staffId]) => ({ start, staffId }));
}

/** Short code customers can read over the phone: no 0/O or 1/I. */
export function bookingCode(rand: () => number = Math.random) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 6; i++) c += chars[Math.floor(rand() * chars.length)];
  return c;
}

/** Thai mobile or landline: 9-10 digits starting with 0, dashes and spaces allowed. */
export function validPhone(p: string) {
  return /^0\d{8,9}$/.test(p.replace(/[\s-]/g, ""));
}

/** Figures for the dashboard over a set of bookings. */
export function stats(bookings: Booking[]) {
  const counted = bookings.filter((b) => b.status !== "cancelled");
  const finished = counted.filter((b) => b.status === "done");
  const noshow = counted.filter((b) => b.status === "noshow").length;
  const past = counted.filter((b) => b.status === "done" || b.status === "noshow").length;
  return {
    bookings: counted.length,
    revenue: finished.reduce((sum, b) => sum + b.price, 0),
    noshowRate: past ? noshow / past : 0,
    cancelled: bookings.length - counted.length,
  };
}

/** CSV that Excel opens with Thai text intact (UTF-8 with BOM). */
export function toCsv(bookings: Booking[], services: Service[], staff: Staff[]) {
  const name = (list: { id: string; name: string }[], id: string) => list.find((x) => x.id === id)?.name ?? id;
  const head = ["รหัสจอง", "วันที่", "เวลา", "บริการ", "ช่าง", "ราคา", "ลูกค้า", "โทร", "สถานะ", "หมายเหตุ"];
  const rows = bookings.map((b) => [b.code, b.date, toTime(b.start), name(services, b.serviceId), name(staff, b.staffId), b.price,
    b.name, b.phone, STATUS_TH[b.status], b.note]);
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [head, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
}

/** Calendar file so the customer can add the appointment to their phone. */
export function toIcs(b: Booking, serviceName: string, shopName: string) {
  const d = b.date.replace(/-/g, "");
  const t = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}00`;
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//jongkiew//TH", "BEGIN:VEVENT", `UID:${b.code}@jongkiew`,
    `DTSTART;TZID=Asia/Bangkok:${d}T${t(b.start)}`, `DTEND;TZID=Asia/Bangkok:${d}T${t(b.start + b.minutes)}`,
    `SUMMARY:${serviceName} · ${shopName}`, `DESCRIPTION:รหัสจอง ${b.code}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}
