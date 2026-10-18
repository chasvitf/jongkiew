"use client";
import { useState } from "react";
import { STATUS_TH, blocks, dateKey, parseKey, stats, toCsv, toTime, type Booking, type Status } from "@/lib/booking";
import { resetDemo, update, useData, type Data } from "@/lib/store";

type Role = "staff" | "admin";
const STATUS_STYLE: Record<Status, string> = {
  booked: "bg-blue-50 border-blue-300 text-blue-900",
  arrived: "bg-amber-50 border-amber-300 text-amber-900",
  done: "bg-green-50 border-green-300 text-green-900",
  noshow: "bg-red-50 border-red-300 text-red-900",
  cancelled: "bg-gray-50 border-gray-200 text-gray-500 line-through",
};
const shift = (key: string, days: number) => { const d = parseKey(key); d.setDate(d.getDate() + days); return dateKey(d); };
const thaiLong = (key: string) => parseKey(key).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export default function AdminPage() {
  const data = useData();
  const [role, setRole] = useState<Role | null>(null);
  const [tab, setTab] = useState<"queue" | "summary" | "settings">("queue");
  if (!data) return <p className="text-muted">กำลังโหลด…</p>;

  if (!role) {
    return (
      <section className="mx-auto max-w-md rounded-3xl border border-line bg-card p-6 text-center">
        <h1 className="text-2xl font-bold">เข้าสู่ระบบหลังร้าน</h1>
        <p className="mt-2 text-sm text-muted">เดโม: เลือกบทบาทเพื่อลองใช้ (งานจริงล็อกอินด้วยอีเมลหรือ LINE และแยกสิทธิ์ตามบทบาท)</p>
        <div className="mt-5 grid gap-3">
          <button onClick={() => setRole("staff")} className="rounded-2xl border border-line p-4 text-left hover:border-brand">
            <b>พนักงาน</b><span className="block text-sm text-muted">ดูคิว เช็กอินลูกค้า เปลี่ยนสถานะ</span>
          </button>
          <button onClick={() => setRole("admin")} className="rounded-2xl border border-brand bg-soft p-4 text-left">
            <b>เจ้าของร้าน (แอดมิน)</b><span className="block text-sm text-muted">ทุกอย่างของพนักงาน + สรุปยอด ดาวน์โหลด Excel ตั้งค่าบริการและเวลาเปิด</span>
          </button>
        </div>
      </section>
    );
  }

  const tabs = role === "admin" ? (["queue", "summary", "settings"] as const) : (["queue"] as const);
  const label = { queue: "คิว", summary: "สรุปยอด", settings: "ตั้งค่า" };
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-line bg-card p-1">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === t ? "bg-brand text-brand-ink" : "text-muted"}`}>{label[t]}</button>
          ))}
        </div>
        <p className="text-sm text-muted">เข้าใช้เป็น <b className="text-foreground">{role === "admin" ? "เจ้าของร้าน" : "พนักงาน"}</b> ·{" "}
          <button className="underline" onClick={() => { setRole(null); setTab("queue"); }}>ออกจากระบบ</button></p>
      </div>
      <div className="mt-5">
        {tab === "queue" && <Queue data={data} />}
        {tab === "summary" && role === "admin" && <Summary data={data} />}
        {tab === "settings" && role === "admin" && <SettingsTab data={data} />}
      </div>
    </div>
  );
}

function setStatus(code: string, status: Status) {
  update((d) => ({ ...d, bookings: d.bookings.map((b) => (b.code === code ? { ...b, status } : b)) }));
}

function Queue({ data }: { data: Data }) {
  const [day, setDay] = useState(dateKey(new Date()));
  const hours = data.settings.week[parseKey(day).getDay()];
  const list = data.bookings.filter((b) => b.date === day).sort((a, b) => a.start - b.start);
  const PX = 1.1;   // pixels per minute on the timeline
  const name = (id: string) => data.services.find((s) => s.id === id)?.name ?? id;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setDay(shift(day, -1))} className="rounded-full border border-line bg-card px-3 py-1.5" aria-label="วันก่อน">‹</button>
        <button onClick={() => setDay(dateKey(new Date()))} className="rounded-full border border-line bg-card px-3 py-1.5 text-sm">วันนี้</button>
        <button onClick={() => setDay(shift(day, 1))} className="rounded-full border border-line bg-card px-3 py-1.5" aria-label="วันถัดไป">›</button>
        <h1 className="ml-2 text-xl font-bold">{thaiLong(day)}</h1>
        <span className="text-sm text-muted">{list.filter(blocks).length} คิว</span>
      </div>

      {!hours ? <p className="mt-4 rounded-2xl bg-soft p-4 text-muted">ร้านปิดวันนี้</p> : (
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="overflow-x-auto rounded-2xl border border-line bg-card p-3">
            <div className="flex min-w-[420px]">
              <div className="relative w-12 shrink-0" style={{ height: (hours.close - hours.open) * PX + 24 }}>
                {Array.from({ length: Math.floor((hours.close - hours.open) / 60) + 1 }, (_, i) => (
                  <span key={i} className="absolute text-xs text-muted" style={{ top: 22 + i * 60 * PX - 7 }}>{toTime(hours.open + i * 60)}</span>
                ))}
              </div>
              {data.staff.map((p) => (
                <div key={p.id} className="relative flex-1 border-l border-line" style={{ height: (hours.close - hours.open) * PX + 24 }}>
                  <p className="px-2 text-sm font-bold">{p.name}</p>
                  {data.settings.breaks.map((br, i) => (
                    <div key={i} className="absolute inset-x-1 rounded bg-[repeating-linear-gradient(45deg,#eee_0_6px,#f8f8f8_6px_12px)] text-center text-[11px] text-muted"
                      style={{ top: 22 + (br.start - hours.open) * PX, height: (br.end - br.start) * PX }}>พัก</div>
                  ))}
                  {list.filter((b) => b.staffId === p.id && b.status !== "cancelled").map((b) => (
                    <div key={b.code} className={`absolute inset-x-1 overflow-hidden rounded-lg border px-2 py-0.5 text-xs ${STATUS_STYLE[b.status]}`}
                      style={{ top: 22 + (b.start - hours.open) * PX, height: b.minutes * PX - 2 }} title={`${b.name} · ${name(b.serviceId)}`}>
                      <b>{toTime(b.start)}</b> {b.name} · {name(b.serviceId)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <ul className="space-y-2">
            {list.length === 0 && <li className="rounded-2xl bg-soft p-4 text-sm text-muted">ยังไม่มีคิว</li>}
            {list.map((b) => <QueueItem key={b.code} b={b} data={data} />)}
          </ul>
        </div>
      )}
    </div>
  );
}

function QueueItem({ b, data }: { b: Booking; data: Data }) {
  const service = data.services.find((s) => s.id === b.serviceId);
  const staff = data.staff.find((s) => s.id === b.staffId);
  const actions: [Status, string][] = b.status === "booked" ? [["arrived", "มาถึงแล้ว"], ["noshow", "ไม่มา"], ["cancelled", "ยกเลิก"]]
    : b.status === "arrived" ? [["done", "เสร็จแล้ว"]] : [["booked", "ย้อนสถานะ"]];
  return (
    <li className={`rounded-2xl border p-3 ${STATUS_STYLE[b.status].replace("line-through", "")}`}>
      <div className="flex items-baseline justify-between gap-2">
        <b>{toTime(b.start)}-{toTime(b.start + b.minutes)} · {b.name}</b>
        <span className="text-xs font-medium">{STATUS_TH[b.status]}</span>
      </div>
      <p className="text-sm">{service?.name} · {staff?.name} · {b.price.toLocaleString("th-TH")} บาท</p>
      <p className="text-xs opacity-80">โทร {b.phone} · รหัส {b.code}{b.note ? ` · ${b.note}` : ""}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {actions.map(([s, text]) => (
          <button key={s} onClick={() => setStatus(b.code, s)} className="rounded-full border border-current bg-white/70 px-3 py-1 text-xs font-medium">{text}</button>
        ))}
      </div>
    </li>
  );
}

function Summary({ data }: { data: Data }) {
  const today = dateKey(new Date());
  const days = Array.from({ length: 7 }, (_, i) => shift(today, i - 6));
  const inRange = data.bookings.filter((b) => b.date >= days[0] && b.date <= today);
  const s = stats(inRange);
  const perDay = days.map((d) => {
    const ofDay = data.bookings.filter((b) => b.date === d);
    return { d, count: ofDay.filter((b) => b.status !== "cancelled").length, revenue: stats(ofDay).revenue };
  });
  const maxRevenue = Math.max(1, ...perDay.map((p) => p.revenue));
  const byService = data.services.map((sv) => ({ sv, n: inRange.filter((b) => b.serviceId === sv.id && b.status === "done").length }))
    .sort((a, b) => b.n - a.n);

  function exportCsv() {
    const from = shift(today, -6), to = shift(today, 7);
    const rows = data.bookings.filter((b) => b.date >= from && b.date <= to).sort((a, b) => (a.date + toTime(a.start)).localeCompare(b.date + toTime(b.start)));
    const blob = new Blob([toCsv(rows, data.services, data.staff)], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `bookings-${from}-to-${to}.csv` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-bold">7 วันล่าสุด</h1>
        <button onClick={exportCsv} className="rounded-full bg-ok px-4 py-2 text-sm font-medium text-white">ดาวน์โหลด Excel (CSV) 14 วัน</button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card k="คิวทั้งหมด" v={s.bookings.toLocaleString("th-TH")} />
        <Card k="รายได้ (คิวที่เสร็จ)" v={`฿${s.revenue.toLocaleString("th-TH")}`} />
        <Card k="ไม่มาตามนัด" v={`${Math.round(s.noshowRate * 100)}%`} />
        <Card k="ยกเลิก" v={String(s.cancelled)} />
      </div>
      <div className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-sm font-bold text-muted">รายได้รายวัน</h2>
        <div className="mt-3 flex h-44 items-end gap-2">
          {perDay.map((p) => (
            <div key={p.d} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[11px] text-muted">{p.revenue ? `฿${p.revenue.toLocaleString("th-TH")}` : ""}</span>
              <div className="w-full rounded-t-lg bg-brand" style={{ height: `${(p.revenue / maxRevenue) * 120}px` }} />
              <span className="text-xs">{parseKey(p.d).toLocaleDateString("th-TH", { weekday: "short", day: "numeric" })}</span>
              <span className="text-[11px] text-muted">{p.count} คิว</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-sm font-bold text-muted">บริการยอดนิยม (คิวที่เสร็จ)</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {byService.map(({ sv, n }) => <li key={sv.id} className="flex justify-between"><span>{sv.name}</span><b>{n}</b></li>)}
        </ul>
      </div>
    </div>
  );
}

function Card({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs text-muted">{k}</p>
      <p className="mt-1 text-2xl font-bold">{v}</p>
    </div>
  );
}

function SettingsTab({ data }: { data: Data }) {
  const [services, setServices] = useState(data.services);
  const [week, setWeek] = useState(data.settings.week);
  const [saved, setSaved] = useState(false);
  const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const toMin = (v: string) => { const [h, m] = v.split(":").map(Number); return h * 60 + m; };

  function saveAll() {
    update((d) => ({ ...d, services, settings: { ...d.settings, week } }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="font-bold">บริการและราคา</h2>
        <table className="mt-3 w-full text-sm">
          <thead><tr className="text-left text-muted"><th className="py-1 font-medium">บริการ</th><th className="font-medium">นาที</th><th className="font-medium">ราคา</th></tr></thead>
          <tbody>
            {services.map((s, i) => (
              <tr key={s.id}>
                <td className="py-1">{s.name}</td>
                <td><input type="number" min={5} step={5} value={s.minutes} aria-label={`เวลา ${s.name}`} className="w-20 rounded-lg border border-line px-2 py-1"
                  onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, minutes: Number(e.target.value) || x.minutes } : x)))} /></td>
                <td><input type="number" min={0} step={10} value={s.price} aria-label={`ราคา ${s.name}`} className="w-24 rounded-lg border border-line px-2 py-1"
                  onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) || 0 } : x)))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="font-bold">เวลาเปิดร้าน</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {week.map((h, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <span className="w-20">{DAYS[i]}</span>
              <label className="flex items-center gap-1"><input type="checkbox" checked={!h}
                onChange={(e) => setWeek(week.map((x, j) => (j === i ? (e.target.checked ? null : { open: 600, close: 1200 }) : x)))} /> ปิด</label>
              {h && <>
                <input type="time" value={toTime(h.open)} aria-label={`เปิด ${DAYS[i]}`} className="rounded-lg border border-line px-2 py-1"
                  onChange={(e) => setWeek(week.map((x, j) => (j === i && x ? { ...x, open: toMin(e.target.value) } : x)))} />–
                <input type="time" value={toTime(h.close)} aria-label={`ปิด ${DAYS[i]}`} className="rounded-lg border border-line px-2 py-1"
                  onChange={(e) => setWeek(week.map((x, j) => (j === i && x ? { ...x, close: toMin(e.target.value) } : x)))} />
              </>}
            </li>
          ))}
        </ul>
      </section>
      <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
        <button onClick={saveAll} className="rounded-full bg-brand px-5 py-2.5 font-medium text-brand-ink">บันทึกการตั้งค่า</button>
        {saved && <span className="text-sm text-ok">บันทึกแล้ว</span>}
        <button onClick={() => { if (confirm("ล้างข้อมูลเดโมแล้วเริ่มใหม่?")) resetDemo(); }} className="ml-auto text-sm text-muted underline">รีเซ็ตข้อมูลเดโม</button>
      </div>
    </div>
  );
}
