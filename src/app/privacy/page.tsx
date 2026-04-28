import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Payment Tracker",
  description: "How we collect, use, and protect your financial data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={15} />
          กลับไปหน้าแรก
        </Link>

        <div className="mt-8 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--soft)] text-[var(--gold)]">
            <ShieldCheck size={20} />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Privacy Policy
          </h1>
        </div>

        <p className="mt-2 text-[14px] text-[var(--text-muted)]">
          อัปเดตล่าสุด: 28 เมษายน 2026
        </p>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          <section>
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">
              1. ข้อมูลที่เราเก็บ
            </h2>
            <p>
              เราเก็บข้อมูลธุรกรรมทางการเงินที่คุณบันทึกผ่านแอปพลิเคชัน ได้แก่ 
              จำนวนเงิน หมวดหมู่ วันที่ เวลา ชื่อผู้รับ และเลขอ้างอิงจากสลิปธนาคาร 
              รวมถึงรูปภาพสลิปที่คุณอัปโหลดเพื่อประมวลผล
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">
              2. วิธีการใช้ข้อมูล
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>แสดงสรุปรายรับรายจ่ายและแนวโน้มการใช้จ่ายของคุณ</li>
              <li>วิเคราะห์หมวดหมู่เพื่อช่วยให้คุณเข้าใจพฤติกรรมทางการเงิน</li>
              <li>ประมวลผลรูปภาพสลิปด้วย OCR และ AI เพื่อดึงข้อมูลอัตโนมัติ</li>
              <li>สร้างรายงานสรุปรายวัน/รายสัปดาห์/รายเดือน</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">
              3. ความปลอดภัย
            </h2>
            <p>
              ข้อมูลทั้งหมดถูกเข้ารหัสด้วย AES-256-GCM ก่อนบันทึกลงฐานข้อมูล 
              รูปภาพสลิปถูกเก็บในพื้นที่จัดเก็บส่วนตัว (Private Storage) บน Supabase 
              และมีการตรวจสอบ MIME type และ magic bytes ก่อนอัปโหลด 
              เราไม่มีการเข้าถึงข้อมูลธุรกรรมของคุณโดยตรง
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">
              4. การแชร์ข้อมูล
            </h2>
            <p>
              เรา<strong className="text-[var(--text-primary)]">ไม่ขาย ไม่ให้เช่า และไม่แชร์</strong>ข้อมูลส่วนบุคคลหรือข้อมูลธุรกรรมของคุณให้กับบุคคลที่สาม 
              ยกเว้นเมื่อมีคำสั่งศาลหรือข้อกฎหมายกำหนด
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">
              5. สิทธิของคุณ
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>เข้าถึง แก้ไข หรือลบข้อมูลธุรกรรมของคุณได้ตลอดเวลา</li>
              <li>ขอสำเนาข้อมูลที่เราเก็บไว้</li>
              <li>ขอให้ลบบัญชีและข้อมูลทั้งหมดออกจากระบบ</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">
              6. ติดต่อเรา
            </h2>
            <p>
              หากมีคำถามหรือข้อกังวลเกี่ยวกับความเป็นส่วนตัว สามารถติดต่อได้ทาง GitHub Issues 
              ของโปรเจกต์
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-[var(--line)] text-center">
          <Link
            href="/terms"
            className="text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            อ่านข้อกำหนดการใช้งาน →
          </Link>
        </div>
      </div>
    </main>
  );
}
