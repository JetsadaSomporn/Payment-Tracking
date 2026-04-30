import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

const flow = [
  ["01", "อัปโหลดสลิป", "วางรูปสลิปธนาคาร — JPG, PNG, WEBP. ไฟล์ถูก validate ก่อนถึง AI route. รองรับสลิปไทยทุกรูปแบบ"],
  ["02", "AI อ่าน + คุณตรวจสอบ", "NVIDIA AI extracts จำนวนเงิน, ธนาคาร, ผู้รับ, เลขอ้างอิง, วันที่. ถ้า confidence ต่ำ — แจ้งเตือน ไม่ซ่อน"],
  ["03", "คุณยืนยัน → Ledger", "คุณคือคนกดปุ่มสุดท้าย. เมื่อ confirm แล้วเท่านั้น รายการถึงจะเข้า ledger. ไม่มีทางลัด"],
];

const uploadFeatures = [
  "เลือกไฟล์ → AI อ่านสลิป → ยืนยันบันทึก — 3 ขั้นตอนชัดเจน",
  "Confidence badge: ≥75% แสดง gold, ต่ำกว่าเตือนด้วย red",
  "Manual entry mode — กรอกเองได้ถ้าไม่มีสลิป",
];

const dashboardFeatures = [
  "Day / Week / Month toggle — Apple-style segmented control",
  "12 หมวดหมู่: อาหาร, เดินทาง, ช้อปปิ้ง, บิล/บริการ, สุขภาพ, และอื่นๆ",
  "รายรับ / รายจ่าย / โอนเงิน — ทุกประเภทรายการ",
];

export default async function LandingPage() {
  await connection();
  return (
    <main className="bg-[#0A0A0C] text-[#F5F5F7]">
      {/* ═══════════════════════════════════════════════════════════════════
          HERO
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="hero" className="relative min-h-svh overflow-hidden">
        <Image
          priority
          alt=""
          aria-hidden="true"
          className="object-cover object-center"
          fill
          sizes="100vw"
          src="/landing-images/hero-field-console.jpg"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.68)_40%,rgba(0,0,0,0.92)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.08)_50%,rgba(0,0,0,0.70)_100%)]" />

        {/* ── Nav ── */}
        <nav id="landing-nav" className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-8">
          <Link className="text-lg font-bold tracking-[-0.02em] text-[#F5F5F7]" href="/">
            Spendly
          </Link>
          <div className="hidden items-center gap-7 md:flex">
            {[
              ["#flow", "Flow"],
              ["#dashboard", "Dashboard"],
              ["#upload", "Upload"],
              ["#security", "Security"],
            ].map(([href, label]) => (
              <a
                key={href}
                className="text-[12.5px] font-medium uppercase tracking-[0.06em] text-[#A1A1AA] hover:text-[#D4A853] transition-colors"
                href={href}
              >
                {label}
              </a>
            ))}
          </div>
          <Link
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#D4A853] px-5 text-[13px] font-semibold text-[#0A0A0C] hover:bg-[#E0B86A] transition-colors shadow-[0_2px_12px_rgba(212,168,83,0.10)]"
            href="/m"
          >
            Open app
            <ArrowRight size={14} />
          </Link>
        </nav>

        {/* ── Hero content ── */}
        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-72px)] max-w-7xl flex-col justify-center px-6 pb-16 sm:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <p className="inline-flex items-center gap-2.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#D4A853]">
              <span className="w-4 h-px bg-[#D4A853] opacity-35" />
              Thai Bank Slip Tracker
              <span className="w-4 h-px bg-[#D4A853] opacity-35" />
            </p>
            <h1 className="mt-6 font-display text-[clamp(2.8rem,7vw,5rem)] font-bold leading-[0.92] tracking-[-0.05em]">
              Every baht.<br />
              <span className="bg-gradient-to-r from-[#D4A853] via-[#E0B86A] to-[#D4A853] bg-clip-text text-transparent">
                Confirmed.
              </span>
            </h1>
            <p className="mt-5 mx-auto max-w-lg text-[17px] leading-relaxed text-[#A1A1AA]">
              อัปโหลดสลิป → AI ดึงข้อมูล → คุณตรวจสอบและกดยืนยัน
              ไม่มี auto-save ไม่มี guesswork
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                className="inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-[#D4A853] px-7 text-[14.5px] font-semibold text-[#0A0A0C] hover:bg-[#E0B86A] transition-colors shadow-[0_4px_24px_rgba(212,168,83,0.18)]"
                href="/a"
              >
                อัปโหลดสลิปแรก
                <UploadCloud size={15} />
              </Link>
              <Link
                className="inline-flex min-h-12 items-center gap-2 rounded-[10px] border border-white/10 px-7 text-[14.5px] font-semibold text-[#F5F5F7] hover:border-white/20 hover:bg-white/[0.03] transition-colors"
                href="/m"
              >
                ดู Dashboard
              </Link>
            </div>

            {/* Stats strip */}
            <div className="mt-14 flex flex-wrap justify-center gap-x-10 gap-y-4 border-t border-white/[0.06] pt-6">
              {[
                ["Never", "auto-saves"],
                ["Confirmed", "source only"],
                ["Private", "storage"],
                ["0 guesses", "in the ledger"],
              ].map(([val, label]) => (
                <div key={label} className="text-center">
                  <p className="font-figures text-xl font-semibold tracking-[-0.03em]">{val}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[#6E6E73]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-[#6E6E73]">Scroll</span>
          <div className="h-9 w-px animate-pulse bg-gradient-to-b from-[#D4A853] to-transparent" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FLOW
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="flow" className="bg-[#0A0A0C] px-6 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <p className="landing-reveal text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#D4A853]">
            How It Works
          </p>
          <h2 className="landing-reveal landing-d1 mt-4 max-w-xl text-[clamp(2rem,4.5vw,3rem)] font-bold leading-[1.04] tracking-[-0.04em]">
            One action per screen.<br />No shortcuts.
          </h2>

          <div className="landing-reveal landing-d2 mt-14 grid overflow-hidden rounded-2xl sm:grid-cols-3 gap-px bg-white/[0.055]">
            {flow.map(([num, title, text], i) => (
              <div
                key={title}
                className="bg-[#111114] p-8 transition-colors hover:bg-[#18181C]"
              >
                <p className="font-figures text-[52px] font-bold leading-none tracking-[-0.04em] text-transparent bg-gradient-to-b from-[#D4A853] to-[rgba(212,168,83,0.12)] bg-clip-text">
                  {num}
                </p>
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em]">{title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[#A1A1AA]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          DASHBOARD
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="dashboard" className="bg-[#0A0A0C] px-6 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="landing-reveal text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#D4A853]">
                The Dashboard
              </p>
              <h2 className="landing-reveal landing-d1 mt-4 text-[clamp(2rem,4.5vw,3rem)] font-bold leading-[1.04] tracking-[-0.03em]">
                See every baht.<br />At a glance.
              </h2>
              <p className="landing-reveal landing-d1 mt-5 text-[15.5px] leading-relaxed text-[#A1A1AA]">
                Today&apos;s spending. This week&apos;s summary. Category breakdown.
                ตัวเลขทุกตัวมาจากรายการที่คุณ confirm เท่านั้น ฿0.00 จนกว่าคุณจะกดยืนยัน
              </p>
              <div className="landing-reveal landing-d2 mt-6 flex flex-col gap-3">
                {dashboardFeatures.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-[#A1A1AA]">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#D4A853]" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="landing-reveal landing-d2 overflow-hidden rounded-2xl border border-white/[0.055] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.65)]">
              <div className="flex items-center gap-2 border-b border-white/[0.055] bg-white/[0.03] px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28CA41]" />
                <div className="mx-4 flex-1 rounded bg-white/[0.07] px-3 py-1 text-center font-figures text-[11px] text-[#6E6E73]">
                  spendly.app/m
                </div>
              </div>
              <Image
                alt="Spendly Dashboard showing daily spend summary"
                className="w-full"
                height={900}
                src="/product-dashboard.png"
                width={1440}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          UPLOAD
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="upload" className="bg-[#0A0A0C] px-6 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
            <div className="landing-reveal overflow-hidden rounded-2xl border border-white/[0.055] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.65)] lg:order-first">
              <div className="flex items-center gap-2 border-b border-white/[0.055] bg-white/[0.03] px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28CA41]" />
                <div className="mx-4 flex-1 rounded bg-white/[0.07] px-3 py-1 text-center font-figures text-[11px] text-[#6E6E73]">
                  spendly.app/a
                </div>
              </div>
              <Image
                alt="Upload and review slip screen"
                className="w-full"
                height={900}
                src="/product-upload.png"
                width={1440}
              />
            </div>

            <div>
              <p className="landing-reveal text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#D4A853]">
                Upload + Review
              </p>
              <h2 className="landing-reveal landing-d1 mt-4 text-[clamp(2rem,4.5vw,3rem)] font-bold leading-[1.04] tracking-[-0.03em]">
                AI reads the slip.<br />You make the call.
              </h2>
              <p className="landing-reveal landing-d1 mt-5 text-[15.5px] leading-relaxed text-[#A1A1AA]">
                วางสลิป → กด &ldquo;อ่านสลิป&rdquo; → AI แสดงผลลัพธ์ทางฝั่งขวาพร้อม confidence score.
                ถ้าต่ำกว่า 75% — ระบบแจ้งเตือนชัดเจน. คุณแก้ไขและ confirm ก่อน save
              </p>
              <div className="landing-reveal landing-d2 mt-6 flex flex-col gap-3">
                {uploadFeatures.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-[#A1A1AA]">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#D4A853]" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECURITY
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="security" className="bg-[#0A0A0C] px-6 py-24 sm:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
            <div>
              <LockKeyhole size={18} className="landing-reveal text-[#D4A853]" />
              <p className="landing-reveal mt-5 text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#D4A853]">
                Trust Layer
              </p>
              <h2 className="landing-reveal landing-d1 mt-4 text-[clamp(2rem,4.5vw,3rem)] font-bold leading-[1.04] tracking-[-0.03em]">
                Trust is a<br />control surface.
              </h2>
              <p className="landing-reveal landing-d1 mt-5 text-[15.5px] leading-relaxed text-[#A1A1AA]">
                ทุกแถวข้อมูลมี cryptographic signature. AES-256-GCM encryption
                ป้องกันข้อมูล sensitive. RLS-enforced — ข้อมูลคุณ คนอื่นอ่านไม่ได้
              </p>
              <div className="landing-reveal landing-d2 mt-6 flex flex-wrap gap-2.5">
                {["HMAC-SHA256", "AES-256-GCM", "RLS", "Row-Level Signing"].map((b) => (
                  <span
                    key={b}
                    className={
                      b === "HMAC-SHA256"
                        ? "inline-flex items-center gap-1.5 rounded-full border border-[rgba(212,168,83,0.2)] bg-[rgba(212,168,83,0.06)] px-3.5 py-1.5 text-[12px] font-medium text-[#D4A853]"
                        : "inline-flex items-center gap-1.5 rounded-full border border-white/[0.055] bg-[#111114] px-3.5 py-1.5 text-[12px] font-medium text-[#A1A1AA]"
                    }
                  >
                    {b === "HMAC-SHA256" && <ShieldCheck size={12} />}
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div className="landing-reveal landing-d2 rounded-xl border border-white/[0.055] bg-[#18181C] p-5 font-mono text-[11.5px] leading-[1.8] text-[#6E6E73]">
              <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6E6E73]">
                Row Integrity
              </div>
              <span className="text-[#6E6E73] opacity-60">-- Every transaction row</span><br />
              <span className="text-[#22D3EE]">id</span>: <span className="text-[#D4A853]">a1b2c3d4-e5f6-...</span><br />
              <span className="text-[#22D3EE]">amount</span>: <span className="text-[#F5F5F7]">1,250.00</span><br />
              <span className="text-[#22D3EE]">bank</span>: <span className="text-[#F5F5F7]">กสิกรไทย</span><br />
              <span className="text-[#22D3EE]">row_signature</span>: <span className="text-[#D4A853]">HMAC-SHA256</span><br />
              <div className="mt-2.5 border-t border-white/[0.055] pt-2.5">
                <span className="text-[#22D3EE]">encrypted_fields</span>: <span className="text-[#22D3EE]">AES-256-GCM</span>
              </div>
              <div className="mt-1 text-[11px] text-[#D4A853]">✓ Row signature verified</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          CTA
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="flex min-h-[70vh] items-center justify-center bg-[#0A0A0C] px-6 text-center sm:px-8">
        <div className="landing-reveal max-w-lg">
          <h2 className="text-[clamp(2.2rem,5vw,3.4rem)] font-bold leading-[1.04] tracking-[-0.03em]">
            Ready to track<br />every baht?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-[#A1A1AA]">
            Private storage. Confirmed-only ledger.
            Built for people who want precision, not guesses.
          </p>
          <div className="mt-8">
            <Link
              className="inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-[#D4A853] px-7 text-[14.5px] font-semibold text-[#0A0A0C] hover:bg-[#E0B86A] transition-colors shadow-[0_4px_24px_rgba(212,168,83,0.18)]"
              href="/m"
            >
              Open Spendly
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.055] bg-[#0A0A0C] px-6 py-7 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <p className="text-[13px] text-[#6E6E73]">Spendly</p>
          <p className="text-[13px] text-[#6E6E73]">Personal finance. Confirmed.</p>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════════
          SCROLL SCRIPT — reveal + nav + progress bar
          ═══════════════════════════════════════════════════════════════════ */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  // ── Scroll progress bar ──
  var bar=document.createElement('div');
  bar.id='scroll-bar';
  bar.style.cssText='position:fixed;top:0;left:0;height:2px;z-index:100;background:linear-gradient(90deg,#D4A853,#E0B86A,#D4A853);width:0;transition:width 60ms linear';
  document.body.prepend(bar);

  // ── Nav scroll effect ──
  var nav=document.getElementById('landing-nav');
  var lastY=0;

  function onScroll(){
    var y=window.scrollY;
    var h=document.documentElement.scrollHeight-window.innerHeight;
    bar.style.width=h>0?(y/h*100)+'%':'0%';
    if(nav){
      if(y>60)nav.style.cssText='position:fixed;top:0;left:0;right:0;z-index:90;background:rgba(10,10,12,0.88);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.055);padding:16px 28px;display:flex;align-items:center;justify-content:space-between';
      else nav.style.cssText='';
    }
    lastY=y;
  }
  window.addEventListener('scroll',onScroll,{passive:true});

  // ── Reveal on scroll ──
  var observer=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting)e.target.classList.add('landing-visible');
    });
  },{threshold:0.1});
  document.querySelectorAll('.landing-reveal').forEach(function(el){observer.observe(el);});

  // ── Nav smooth scroll ──
  if(nav){
    nav.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        var t=document.querySelector(a.getAttribute('href'));
        if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth'})}
      });
    });
  }
})();
          `.trim(),
        }}
      />
    </main>
  );
}
