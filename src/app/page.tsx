import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

const flow = [
  ["Upload", "Drop in a slip image. The file is validated before it reaches the AI route."],
  ["Review", "AI assists extraction — but the app waits for your confirmation before saving."],
  ["Ledger", "Confirmed transactions become a clean daily ledger, not a pile of OCR guesses."],
];

const controls = [
  ["Auth", "Protected write paths built around a verified Supabase user token."],
  ["Storage", "Private slip storage and user-owned database rows."],
  ["Confidence", "Low-confidence extraction is shown as a warning, not silently trusted."],
];

export default function LandingPage() {
  return (
    <main className="bg-neutral-950 text-white">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-svh overflow-hidden">
        {/* Photo as atmosphere — heavy overlay turns it into depth, not subject */}
        <Image
          priority
          alt=""
          aria-hidden="true"
          className="object-cover object-center"
          fill
          sizes="100vw"
          src="/landing-images/hero-field-console.jpg"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.70)_40%,rgba(0,0,0,0.92)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.10)_50%,rgba(0,0,0,0.72)_100%)]" />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-8">
          <Link className="text-sm font-semibold tracking-tight text-white" href="/">
            Payment Tracker
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-white/50 md:flex">
            <a className="hover:text-white transition-colors" href="#product">Product</a>
            <a className="hover:text-white transition-colors" href="#security">Security</a>
            <a className="hover:text-white transition-colors" href="#ai">AI</a>
          </div>
          <Link
            className="inline-flex min-h-9 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-neutral-950 hover:bg-neutral-100 transition-colors"
            href="/app"
          >
            Open app
            <ArrowRight size={14} />
          </Link>
        </nav>

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-72px)] max-w-7xl flex-col justify-center px-6 pb-16 sm:px-8">
          <div className="max-w-5xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
              Thai bank slip tracker
            </p>
            <h1 className="mt-6 font-display text-[clamp(3.5rem,9vw,8rem)] font-semibold leading-[0.88] tracking-[-0.055em]">
              Every baht.<br />Confirmed.
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-7 text-white/55">
              Upload a slip. Review the AI extraction. Save only what you confirm.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-neutral-950 hover:bg-neutral-100 transition-colors"
                href="/upload"
              >
                Upload first slip
                <UploadCloud size={15} />
              </Link>
              <Link
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 px-6 text-sm font-semibold text-white/80 hover:border-white/30 hover:text-white transition-colors"
                href="/app"
              >
                View dashboard
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-20 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-8">
            {[
              ["Never", "auto-saves"],
              ["Confirmed", "source only"],
              ["Private", "storage"],
              ["0 guesses", "in the ledger"],
            ].map(([val, label]) => (
              <div key={label}>
                <p className="font-figures text-xl font-semibold tracking-[-0.04em]">{val}</p>
                <p className="mt-0.5 text-xs text-white/40">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product screenshot ────────────────────────────────────────────── */}
      <section className="bg-neutral-950 px-6 pb-24 sm:px-8" id="product">
        <div className="mx-auto max-w-7xl">
          <p className="mb-8 text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
            The dashboard
          </p>

          {/* Browser chrome mockup */}
          <div className="overflow-hidden rounded-xl border border-white/[0.07] shadow-[0_60px_160px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.04] px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              </div>
              <div className="mx-4 flex-1 rounded bg-white/[0.07] px-3 py-1 text-center font-figures text-[11px] text-white/30">
                payment-tracker.vercel.app/app
              </div>
            </div>
            <Image
              alt="Payment Tracker dashboard showing daily spend summary"
              className="w-full"
              height={900}
              priority
              src="/product-dashboard.png"
              width={1440}
            />
          </div>

          {/* Feature trio below screenshot */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["฿0.00", "Starts empty", "Nothing appears until you confirm a real transaction."],
              ["3 steps", "Capture → Review → Save", "The only path. No shortcuts that bypass confirmation."],
              ["1 owner", "Your data, your rows", "RLS-enforced. Other users cannot read your transactions."],
            ].map(([val, title, text]) => (
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-5" key={title}>
                <p className="font-figures text-2xl font-semibold tracking-[-0.04em]">{val}</p>
                <p className="mt-3 text-sm font-semibold text-white/80">{title}</p>
                <p className="mt-1.5 text-sm leading-6 text-white/40">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Upload flow ───────────────────────────────────────────────────── */}
      <section className="bg-[#0A0A0A] px-6 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                Flow
              </p>
              <h2 className="mt-4 text-4xl font-semibold leading-[0.96] tracking-[-0.05em] sm:text-5xl">
                One action<br />per screen.
              </h2>
            </div>
            <div className="divide-y divide-white/[0.07] border-y border-white/[0.07] lg:w-[52%]">
              {flow.map(([title, text], i) => (
                <div className="grid gap-4 py-6 sm:grid-cols-[56px_1fr]" key={title}>
                  <p className="font-figures text-sm text-white/25">0{i + 1}</p>
                  <div>
                    <p className="font-semibold tracking-[-0.025em]">{title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-white/45">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upload screenshot */}
          <div className="overflow-hidden rounded-xl border border-white/[0.07] shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2 border-b border-white/[0.07] bg-white/[0.04] px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              </div>
              <div className="mx-4 flex-1 rounded bg-white/[0.07] px-3 py-1 text-center font-figures text-[11px] text-white/30">
                payment-tracker.vercel.app/upload
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
        </div>
      </section>

      {/* ── Trust ─────────────────────────────────────────────────────────── */}
      <section className="bg-neutral-950 px-6 py-20 sm:px-8 lg:py-28" id="security">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <LockKeyhole size={20} className="text-white/50" />
            <h2 className="mt-6 text-5xl font-semibold leading-[0.96] tracking-[-0.055em] sm:text-6xl">
              Trust is a<br />control surface.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/45">
              Every risky step is visible and reversible until you confirm it.
            </p>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/[0.07] sm:grid-cols-3">
            {controls.map(([title, text]) => (
              <div className="bg-white/[0.025] p-6 hover:bg-white/[0.04] transition-colors" key={title}>
                <ShieldCheck size={16} className="text-white/40" />
                <p className="mt-5 font-semibold tracking-[-0.025em]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-white/40">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI ────────────────────────────────────────────────────────────── */}
      <section className="bg-[#0A0A0A] px-6 py-20 sm:px-8 lg:py-28" id="ai">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                AI with boundaries
              </p>
              <h2 className="mt-5 text-5xl font-semibold leading-[0.96] tracking-[-0.055em] sm:text-6xl">
                Assist extraction.<br />Never invent<br />the ledger.
              </h2>
              <p className="mt-6 text-lg leading-8 text-white/45">
                If confidence is low, the app shows it clearly and waits for manual input.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-neutral-950 hover:bg-neutral-100 transition-colors"
                href="/upload"
              >
                Start with a slip
                <ReceiptText size={15} />
              </Link>
              <Link
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 px-6 text-sm font-semibold text-white/70 hover:border-white/30 hover:text-white transition-colors"
                href="/settings"
              >
                Review controls
                <CheckCircle2 size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.07] bg-neutral-950 px-6 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <p className="text-sm font-semibold tracking-tight text-white/50">Payment Tracker</p>
          <p className="text-xs text-white/25">Personal finance. Confirmed.</p>
        </div>
      </footer>

    </main>
  );
}
