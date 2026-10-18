"use client";
import Link from "next/link";
import { useState } from "react";
import {
  bookingCode, dateKey, freeSlots, freeSlotsAnyStaff, parseKey, toIcs, toTime, validPhone, type Booking, type Service,
} from "@/lib/booking";
import { update, useData } from "@/lib/store";

const DAY = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const MONTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const thaiDay = (key: string) => {
  const d = parseKey(key);
  return `${DAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`;
};

export default function BookPage() {
  const data = useData();
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("any");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<{ start: number; staffId: string } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<Booking | null>(null);

  if (!data) return <p className="text-muted">กำลังโหลด…</p>;
  const now = new Date();
  const days = Array.from({ length: data.settings.daysAhead }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    return { key: dateKey(d), open: !!data.settings.week[d.getDay()] };
  });
  const service = data.services.find((s) => s.id === serviceId);
  const slots = service && date
    ? staffId === "any"
      ? freeSlotsAnyStaff(date, service, data.staff, data.bookings, data.settings, now)
      : freeSlots(date, service, staffId, data.bookings, data.settings, now).map((start) => ({ start, staffId }))
    : [];
  const staffName = (id: string) => data.staff.find((s) => s.id === id)?.name ?? "";

  function confirm() {
    if (!service || !slot) return;
    if (name.trim().length < 2) return setError("กรุณาใส่ชื่อ");
    if (!validPhone(phone)) return setError("เบอร์โทรไม่ถูกต้อง (เช่น 081-234-5678)");
    // Someone else may have taken the time while this form was open.
    const stillFree = freeSlots(date, service, slot.staffId, data!.bookings, data!.settings, new Date()).includes(slot.start);
    if (!stillFree) {
      setSlot(null);
      return setError("เวลานี้เพิ่งถูกจองไป กรุณาเลือกเวลาใหม่");
    }
    const booking = newBooking(service, slot, date, name, phone, note);
    update((d) => ({ ...d, bookings: [...d.bookings, booking] }));
    setDone(booking);
    setError("");
  }

  function downloadIcs(b: Booking) {
    const blob = new Blob([toIcs(b, service?.name ?? "นัดหมาย", data!.settings.shopName)], { type: "text/calendar" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `booking-${b.code}.ics` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  if (done) {
    const s = data.services.find((x) => x.id === done.serviceId)!;
    return (
      <section className="mx-auto max-w-lg rounded-3xl border border-line bg-card p-6 text-center">
        <p className="text-sm font-medium text-ok">จองสำเร็จ</p>
        <h1 className="mt-1 text-2xl font-bold">รหัสจองของคุณ</h1>
        <p className="mt-3 font-mono text-4xl font-bold tracking-[0.25em] text-brand">{done.code}</p>
        <dl className="mt-5 grid grid-cols-2 gap-2 text-left text-sm">
          <dt className="text-muted">บริการ</dt><dd>{s.name} ({s.minutes} นาที)</dd>
          <dt className="text-muted">ช่าง</dt><dd>{staffName(done.staffId)}</dd>
          <dt className="text-muted">วันเวลา</dt><dd>{thaiDay(done.date)} {toTime(done.start)} น.</dd>
          <dt className="text-muted">ราคา</dt><dd>{done.price.toLocaleString("th-TH")} บาท (ชำระที่ร้าน)</dd>
        </dl>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button onClick={() => downloadIcs(done)} className="rounded-full bg-brand px-4 py-2.5 font-medium text-brand-ink">เพิ่มลงปฏิทิน</button>
          <Link href={`/my?code=${done.code}`} className="rounded-full border border-line px-4 py-2.5 font-medium">ดู / ยกเลิกการจอง</Link>
        </div>
        <div className="mt-6 rounded-2xl bg-soft p-4 text-left text-sm">
          <p className="font-medium">ร้านได้รับแจ้งเตือนทาง LINE แบบนี้ <span className="text-muted">(งานจริงส่งผ่าน LINE Messaging API)</span></p>
          <p className="mt-2 whitespace-pre-line rounded-xl bg-card p-3 font-mono text-xs leading-relaxed">
            {`📅 คิวใหม่ ${done.code}\n${thaiDay(done.date)} ${toTime(done.start)}-${toTime(done.start + done.minutes)}\n${s.name} · ${staffName(done.staffId)}\nลูกค้า ${done.name}`}
          </p>
        </div>
        <button onClick={() => { setDone(null); setSlot(null); setDate(""); setServiceId(""); setName(""); setPhone(""); setNote(""); }}
          className="mt-5 text-sm font-medium text-brand underline">จองอีกคิว</button>
      </section>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">จองคิวล่วงหน้า</h1>
          <p className="mt-1 text-muted">เลือกบริการ ช่าง และเวลาที่สะดวก ไม่ต้องโทรถาม ระบบโชว์เฉพาะเวลาที่ว่างจริง</p>
        </div>

        <Step n={1} title="เลือกบริการ">
          <div className="grid gap-3 sm:grid-cols-2">
            {data.services.map((s) => (
              <button key={s.id} onClick={() => { setServiceId(s.id); setSlot(null); }}
                className={`rounded-2xl border p-4 text-left transition ${s.id === serviceId ? "border-brand bg-soft ring-2 ring-brand" : "border-line bg-card hover:border-brand"}`}>
                <b className="block">{s.name}</b>
                <span className="text-sm text-muted">{s.minutes} นาที · {s.price.toLocaleString("th-TH")} บาท</span>
              </button>
            ))}
          </div>
        </Step>

        <Step n={2} title="เลือกช่าง" muted={!service}>
          <div className="flex flex-wrap gap-2">
            {[{ id: "any", name: "ใครก็ได้ (คิวเร็วสุด)" }, ...data.staff].map((p) => (
              <button key={p.id} disabled={!service} onClick={() => { setStaffId(p.id); setSlot(null); }}
                className={`rounded-full border px-4 py-2 text-sm font-medium disabled:opacity-40 ${p.id === staffId ? "border-brand bg-brand text-brand-ink" : "border-line bg-card"}`}>
                {p.name}
              </button>
            ))}
          </div>
        </Step>

        <Step n={3} title="เลือกวันและเวลา" muted={!service}>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((d) => (
              <button key={d.key} disabled={!service || !d.open} onClick={() => { setDate(d.key); setSlot(null); }}
                className={`min-w-[74px] rounded-xl border px-2 py-2 text-center text-sm disabled:opacity-40 ${d.key === date ? "border-brand bg-brand text-brand-ink" : "border-line bg-card"}`}>
                <span className="block font-medium">{thaiDay(d.key).split(" ")[0]}</span>
                <span className="block">{thaiDay(d.key).split(" ").slice(1).join(" ")}</span>
                {!d.open && <span className="block text-xs">ปิด</span>}
              </button>
            ))}
          </div>
          {service && date && (
            slots.length ? (
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {slots.map((s) => (
                  <button key={s.start} onClick={() => setSlot(s)}
                    className={`rounded-lg border px-2 py-2 text-sm font-medium ${slot?.start === s.start ? "border-brand bg-brand text-brand-ink" : "border-line bg-card hover:border-brand"}`}>
                    {toTime(s.start)}
                  </button>
                ))}
              </div>
            ) : <p className="mt-3 rounded-xl bg-soft p-3 text-sm text-muted">วันนี้คิวเต็มแล้ว ลองเลือกวันอื่นหรือช่างคนอื่น</p>
          )}
        </Step>

        <Step n={4} title="ข้อมูลผู้จอง" muted={!slot}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">ชื่อ<input value={name} onChange={(e) => setName(e.target.value)} disabled={!slot}
              className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2" placeholder="ชื่อเล่นก็ได้" /></label>
            <label className="text-sm">เบอร์โทร<input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!slot} inputMode="tel"
              className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2" placeholder="081-234-5678" /></label>
            <label className="text-sm sm:col-span-2">หมายเหตุถึงช่าง (ไม่บังคับ)<input value={note} onChange={(e) => setNote(e.target.value)} disabled={!slot}
              className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2" placeholder="เช่น ทรงเดิม รองทรงสูง" /></label>
          </div>
        </Step>
      </div>

      <aside className="h-fit rounded-3xl border border-line bg-card p-5 md:sticky md:top-4">
        <h2 className="font-bold">สรุปการจอง</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row k="บริการ" v={service ? `${service.name} (${service.minutes} นาที)` : "–"} />
          <Row k="ช่าง" v={slot ? staffName(slot.staffId) : staffId === "any" ? "ใครก็ได้" : staffName(staffId)} />
          <Row k="วันเวลา" v={date ? `${thaiDay(date)}${slot ? ` ${toTime(slot.start)} น.` : ""}` : "–"} />
          <Row k="ราคา" v={service ? `${service.price.toLocaleString("th-TH")} บาท` : "–"} />
        </dl>
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-2 text-sm text-accent">{error}</p>}
        <button onClick={confirm} disabled={!slot}
          className="mt-4 w-full rounded-full bg-brand px-4 py-3 font-bold text-brand-ink disabled:opacity-40">ยืนยันการจอง</button>
        <p className="mt-2 text-xs text-muted">ชำระเงินที่ร้าน ยกเลิกได้เองด้วยรหัสจองและเบอร์โทร</p>
      </aside>
    </div>
  );
}

// Outside the component: it reads the clock and makes a random code, which a render must not do.
function newBooking(service: Service, slot: { start: number; staffId: string }, date: string, name: string, phone: string, note: string): Booking {
  return {
    code: bookingCode(), serviceId: service.id, staffId: slot.staffId, date, start: slot.start, minutes: service.minutes,
    price: service.price, name: name.trim(), phone: phone.replace(/[\s-]/g, ""), note: note.trim(), status: "booked", createdAt: Date.now(),
  };
}

function Step({ n, title, muted, children }: { n: number; title: string; muted?: boolean; children: React.ReactNode }) {
  return (
    <section className={muted ? "opacity-60" : ""}>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-sm text-brand-ink">{n}</span>{title}
      </h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
