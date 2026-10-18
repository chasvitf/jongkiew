"use client";
// Demo data layer: everything lives in this browser's localStorage, so every
// visitor gets their own shop to play with. A real shop swaps this file for
// Supabase calls (same shapes: services, staff, bookings, settings).
import { useSyncExternalStore } from "react";
import { bookingCode, dateKey, freeSlots, type Booking, type Service, type Settings, type Staff } from "./booking";

export type Data = { services: Service[]; staff: Staff[]; bookings: Booking[]; settings: Settings };

const KEY = "jongkiew-demo-v1";

export const DEFAULT_SERVICES: Service[] = [
  { id: "cut", name: "ตัดผมชาย", minutes: 30, price: 250 },
  { id: "cutwash", name: "ตัด + สระ + ไดร์", minutes: 45, price: 350 },
  { id: "shave", name: "โกนหนวดผ้าร้อน", minutes: 20, price: 150 },
  { id: "color", name: "ทำสีผม", minutes: 90, price: 900 },
];
export const DEFAULT_STAFF: Staff[] = [{ id: "nok", name: "ช่างนก" }, { id: "tae", name: "ช่างเต้" }];
export const DEFAULT_SETTINGS: Settings = {
  shopName: "บาร์เบอร์ตัวอย่าง",
  slotStep: 15,
  leadMinutes: 30,
  daysAhead: 14,
  week: [{ open: 600, close: 1140 }, { open: 600, close: 1200 }, { open: 600, close: 1200 }, null,
    { open: 600, close: 1200 }, { open: 600, close: 1200 }, { open: 540, close: 1200 }],
  breaks: [{ start: 780, end: 840 }],
};

const FIRST = ["สมชาย", "ธนพล", "ภูมิ", "กิตติ", "อนันต์", "ณัฐ", "ปกรณ์", "วีระ", "ต้น", "บอส", "เจมส์", "ไผ่"];

// Seeded random so the demo shop looks the same for everyone on first visit.
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

/** A believable shop: about 9 days back and 6 ahead of bookings around today. */
export function seed(now = new Date()): Data {
  const rand = rng(20261019);
  const bookings: Booking[] = [];
  for (let d = -9; d <= 6; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    const key = dateKey(day);
    const target = d < 0 ? 7 : d === 0 ? 6 : Math.max(1, 5 - d);
    for (let i = 0; i < target * 3 && bookings.filter((b) => b.date === key).length < target; i++) {
      const service = DEFAULT_SERVICES[Math.floor(rand() * DEFAULT_SERVICES.length * 0.999)];
      const staff = DEFAULT_STAFF[Math.floor(rand() * 2)];
      const slots = freeSlots(key, service, staff.id, bookings, DEFAULT_SETTINGS, new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0));
      if (!slots.length) continue;
      const start = slots[Math.floor(rand() * slots.length)];
      const past = d < 0 || (d === 0 && start + service.minutes < now.getHours() * 60 + now.getMinutes());
      const roll = rand();
      bookings.push({
        code: bookingCode(rand), serviceId: service.id, staffId: staff.id, date: key, start, minutes: service.minutes, price: service.price,
        // obviously fake numbers, so no real person's phone appears in the demo
        name: FIRST[Math.floor(rand() * FIRST.length)], phone: `08x-xxx-${String(Math.floor(rand() * 10000)).padStart(4, "0")}`, note: "",
        status: past ? (roll < 0.08 ? "noshow" : roll < 0.13 ? "cancelled" : "done") : roll < 0.06 ? "cancelled" : "booked",
        createdAt: day.getTime() - 86400000,
      });
    }
  }
  return { services: DEFAULT_SERVICES, staff: DEFAULT_STAFF, bookings, settings: DEFAULT_SETTINGS };
}

let cache: Data | null = null;
const listeners = new Set<() => void>();

function read(): Data {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Data) : seed();
  } catch {
    cache = seed();   // private mode or blocked storage: the demo still works for this visit
  }
  return cache;
}

export function save(next: Data) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: keep it in memory */
  }
  listeners.forEach((l) => l());
}

export function resetDemo() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  cache = null;
  save(read());
}

export function update(fn: (d: Data) => Data) {
  save(fn(read()));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; l(); } };
  window.addEventListener("storage", onStorage);   // another tab changed the data
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
};

/** null during the server render; the data once the page runs in the browser. */
export function useData(): Data | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
