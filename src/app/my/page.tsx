"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { STATUS_TH, parseKey, toTime } from "@/lib/booking";
import { update, useData } from "@/lib/store";

export default function MyPage() {
  return (
    <Suspense fallback={<p className="text-muted">กำลังโหลด…</p>}>
      <MyBooking />
    </Suspense>
  );
}

function MyBooking() {
  const data = useData();
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [phone, setPhone] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState(0);   // when the lookup ran (render must not read the clock)

  if (!data) return <p className="text-muted">กำลังโหลด…</p>;
  const b = shown ? data.bookings.find((x) => x.code === shown) : undefined;

  function find(e: React.FormEvent) {
    e.preventDefault();
    const hit = data!.bookings.find((x) => x.code === code.trim().toUpperCase() && x.phone === phone.replace(/[\s-]/g, ""));
    // Same message either way, so codes cannot be probed without the phone number.
    if (!hit) return setError("ไม่พบการจองนี้ ตรวจรหัสจองและเบอร์โทรอีกครั้ง");
    setError("");
    setShown(hit.code);
    setCheckedAt(Date.now());
  }

  const start = b ? parseKey(b.date).getTime() + b.start * 60000 : 0;
  const canCancel = b && b.status === "booked" && start - checkedAt > 60 * 60000;

  return (
    <section className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold">การจองของฉัน</h1>
      <p className="mt-1 text-muted">ใส่รหัสจองและเบอร์โทรที่ใช้ตอนจอง</p>
      <form onSubmit={find} className="mt-5 space-y-3 rounded-3xl border border-line bg-card p-5">
        <label className="block text-sm">รหัสจอง<input value={code} onChange={(e) => setCode(e.target.value)} required
          className="mt-1 w-full rounded-xl border border-line px-3 py-2 font-mono uppercase tracking-widest" placeholder="เช่น K7M2QX" /></label>
        <label className="block text-sm">เบอร์โทร<input value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel"
          className="mt-1 w-full rounded-xl border border-line px-3 py-2" placeholder="081-234-5678" /></label>
        {error && <p role="alert" className="text-sm text-accent">{error}</p>}
        <button className="w-full rounded-full bg-brand px-4 py-2.5 font-medium text-brand-ink">ค้นหา</button>
      </form>

      {b && (
        <div className="mt-5 rounded-3xl border border-line bg-card p-5">
          <p className="font-mono text-2xl font-bold tracking-widest text-brand">{b.code}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted">บริการ</dt><dd>{data.services.find((s) => s.id === b.serviceId)?.name}</dd>
            <dt className="text-muted">ช่าง</dt><dd>{data.staff.find((s) => s.id === b.staffId)?.name}</dd>
            <dt className="text-muted">วันเวลา</dt><dd>{parseKey(b.date).toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" })} {toTime(b.start)} น.</dd>
            <dt className="text-muted">สถานะ</dt><dd className="font-medium">{STATUS_TH[b.status]}</dd>
          </dl>
          {canCancel ? (
            <button onClick={() => update((d) => ({ ...d, bookings: d.bookings.map((x) => (x.code === b.code ? { ...x, status: "cancelled" } : x)) }))}
              className="mt-4 w-full rounded-full border border-accent px-4 py-2.5 font-medium text-accent">ยกเลิกการจองนี้</button>
          ) : b.status === "booked" ? (
            <p className="mt-4 text-sm text-muted">ยกเลิกออนไลน์ได้จนถึง 1 ชั่วโมงก่อนเวลานัด หลังจากนั้นโทรแจ้งร้าน</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
