import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const title = "จองคิว · บาร์เบอร์ตัวอย่าง (เว็บแอปเดโม)";
const description = "เว็บแอปจองคิวร้าน: ลูกค้าเลือกบริการ ช่าง และเวลาที่ว่างจริง ร้านดูคิววันนี้ เปลี่ยนสถานะ ดูสรุปยอด และดาวน์โหลด Excel ติดตั้งเป็นแอปบนมือถือได้ เดโมโดย Chanavee Pimprong";

export const metadata: Metadata = {
  metadataBase: new URL("https://jongkiew.vercel.app"),
  title,
  description,
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  openGraph: { title, description, images: [{ url: "/og.png", width: 1200, height: 630 }], locale: "th_TH", type: "website" },
};

export const viewport: Viewport = { themeColor: "#1f3a5f" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className={`${plexThai.variable} antialiased`}>
        <div className="stripe h-2" aria-hidden="true" />
        <header className="border-b border-line bg-card">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              {/* eslint-disable-next-line @next/next/no-img-element -- a 1 KB SVG logo, nothing to optimise */}
              <img src="/icon.svg" alt="" width={30} height={30} />
              บาร์เบอร์ตัวอย่าง
            </Link>
            <nav className="flex gap-1 text-sm">
              <Link href="/" className="rounded-full px-3 py-1.5 hover:bg-soft">จองคิว</Link>
              <Link href="/my" className="rounded-full px-3 py-1.5 hover:bg-soft">การจองของฉัน</Link>
              <Link href="/admin" className="rounded-full bg-brand px-3 py-1.5 font-medium text-brand-ink">หลังร้าน</Link>
            </nav>
          </div>
        </header>
        <p className="bg-soft px-4 py-2 text-center text-xs text-muted">
          เว็บแอปเดโม · ร้านสมมติ · ข้อมูลเก็บในเบราว์เซอร์ของคุณเท่านั้น ·{" "}
          <a className="font-medium text-brand underline" href="https://fastwork.co/user/chasvitf/web-development-26274679" target="_blank" rel="noopener">รับทำเว็บแอปแบบนี้</a>
        </p>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted">
          Next.js · React · TypeScript · Tailwind CSS · PWA · ทำโดย <a className="underline" href="https://chanavee.vercel.app" target="_blank" rel="noopener">Chanavee Pimprong</a> ·{" "}
          <a className="underline" href="https://github.com/chasvitf/jongkiew" target="_blank" rel="noopener">ซอร์สโค้ด</a>
        </footer>
        <script dangerouslySetInnerHTML={{ __html: "if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))" }} />
      </body>
    </html>
  );
}
