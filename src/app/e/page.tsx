import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — Payment Tracker",
  description: "Terms and conditions for using Payment Tracker.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
        <Link
          href="/m"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={15} />
          กลับไปหน้าแรก
        </Link>

        <div className="mt-8 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--soft)] text-[var(--gold)]">
            <FileText size={20} />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Terms of Service
          </h1>
        </div>

        <p className="mt-2 text-[14px] text-[var(--text-muted)]">
          อัปเดตล่าสุด: 28 เมษายน 2026
        </p>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          <section>
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">
              1. การยอมรับข้อกำหนด
            </h2>
            <p>
              การใช้งาน Payment Tracker ถือว่าคุณยอมรับและตกลงที่จะปฏิบัติตามข้อกำหนดเหล่านี้ 
              หากคุณไม่เห็นด้วย กรุณาหยุดใช้งานแอปพลิเคชันทันที
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">
              2. คำจำกัดความ
            </h2>
            <p>
              Payment Tracker เป็นเครื่องมือบันทึกธุรกรรมส่วนบุคคล <strong className="text-[var(--text-primary)]">ไม่ใช่</strong> 
              สถาบันการเงิน ไม่มีการรับฝากเงิน ไม่มีการโอนเงิน และไม่มีการให้คำแนะนำทางการเงิน 
              ข้อมูลที่แสดงเป็นเพียงสรุปจากข้อมูลที่คุณบันทึกเอง
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">
              3. บัญชีผู้ใช้
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>คุณต้องมีอายุอย่างน้อย 13 ปีจึงจะสามารถใช้งานได้</li>
              <li>คุณต้องรักษาความปลอดภัยของบัญชี Google ที่ใช้ลงชื่อเข้าใช้</li>
              <li>ห้ามใช้บัญชีผู้อื่นโดยไม่ได้รับอนุญาต</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">
              4. การใช้งานที่ห้าม
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>ห้ามใช้แอปเพื่อกิจกรรมที่ผิดกฎหมาย หลอกลวง หรือฟอกเงิน</li>
              <li>ห้ามพยายามเข้าถึงระบบโดยไม่ได้รับอนุญาต</li>
              <li>ห้ามส่งมัลแวร์ สคริปต์ หรือโค้ดที่เป็นอันตราย</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">
              5. การสำรองข้อมูล
            </h2>
            <p>
              แม้ว่าเราจะพยายามรักษาความพร้อมใช้งานของระบบ แต่คุณควรสำรองข้อมูลธุรกรรมของตนเอง 
              เราไม่รับผิดชอบต่อการสูญหายของข้อมูลที่เกิดจากเหตุสุดวิสัยหรือการบำรุงรักษาระบบ
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">
              6. การยกเลิกบริการ
            </h2>
            <p>
              เราสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีที่ละเมิดข้อกำหนดโดยไม่ต้องแจ้งให้ทราบล่วงหน้า 
              คุณสามารถลบบัญชีและข้อมูลทั้งหมดได้ตลอดเวลาในหน้า Settings
            </p>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">
              7. การเปลี่ยนแปลงข้อกำหนด
            </h2>
            <p>
              เราอาจปรับปรุงข้อกำหนดนี้เป็นครั้งคราว การเปลี่ยนแปลงจะมีผลทันทีที่เผยแพร่บนเว็บไซต์ 
              การใช้งานต่อเนื่องถือว่าคุณยอมรับข้อกำหนดฉบับปรับปรุง
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-[var(--line)] text-center">
          <Link
            href="/p"
            className="text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            อ่านนโยบายความเป็นส่วนตัว →
          </Link>
        </div>
      </div>
    </main>
  );
}
