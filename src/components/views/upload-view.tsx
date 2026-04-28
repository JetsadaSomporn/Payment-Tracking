"use client";

import { useState } from "react";
import {
  Bot,
  CheckCircle2,
  FileText,
  ScanLine,
  UploadCloud,
} from "lucide-react";
import type { AppCtx } from "@/components/payment-tracker-app";
import { authHeaders } from "@/components/payment-tracker-app";
import { todayBangkokDate, parseAmount } from "@/lib/money";

type EntryMode = "upload" | "manual";

const allCategories = [
  "อาหาร", "เดินทาง", "ช้อปปิ้ง", "บิล/บริการ", "สุขภาพ",
  "งาน/ธุรกิจ", "ครอบครัว", "บันเทิง", "การศึกษา", "รายได้", "โอนเงิน", "อื่น ๆ",
];

const expenseCategories = allCategories.filter(c => c !== "รายได้");
const incomeCategories = ["รายได้", "งาน/ธุรกิจ", "อื่น ๆ"];

export default function UploadView({ ctx }: { ctx: AppCtx }) {
  const [mode, setMode] = useState<EntryMode>("upload");

  return (
    <section className="grid gap-5">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <div className="type-selector">
          <button
            className={`type-selector-btn ${mode === "upload" ? "is-active-transfer" : ""}`}
            onClick={() => setMode("upload")}
            type="button"
          >
            <UploadCloud size={14} className="inline mr-1.5 -mt-0.5" />
            อัปโหลดสลิป
          </button>
          <button
            className={`type-selector-btn ${mode === "manual" ? "is-active-transfer" : ""}`}
            onClick={() => setMode("manual")}
            type="button"
          >
            <FileText size={14} className="inline mr-1.5 -mt-0.5" />
            กรอกเอง
          </button>
        </div>
      </div>

      {mode === "upload" ? (
        <UploadMode ctx={ctx} />
      ) : (
        <ManualMode ctx={ctx} />
      )}
    </section>
  );
}

function UploadMode({ ctx }: { ctx: AppCtx }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      {/* Left: Upload zone */}
      <div className="surface p-6 sm:p-7">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Upload slip
        </h3>

        {/* Progress steps */}
        <div className="mt-4 flex gap-2">
          {[
            { done: Boolean(ctx.selectedFile), label: "เลือกไฟล์" },
            { done: Boolean(ctx.extractedSlip), label: "AI อ่านสลิป" },
            { done: false, label: "ยืนยันบันทึก" },
          ].map((s) => (
            <div
              key={s.label}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-semibold uppercase tracking-wider transition-all ${
                s.done
                  ? "border-[var(--gold)]/25 bg-[var(--gold-dim)] text-[var(--gold)]"
                  : "border-[var(--border-subtle)] text-[var(--text-disabled)]"
              }`}
            >
              {s.done ? <CheckCircle2 size={12} /> : <span className="opacity-50">○</span>}
              {s.label}
            </div>
          ))}
        </div>

        {/* Drop zone */}
        <label className="upload-stage mt-5 flex min-h-[300px] flex-col items-center justify-center p-6 sm:min-h-[400px] text-center cursor-pointer">
          {ctx.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Slip preview"
              className="max-h-[360px] rounded-xl object-contain"
              src={ctx.previewUrl}
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="grid size-16 place-items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-muted)]">
                <UploadCloud size={26} />
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">วางสลิปที่นี่ หรือคลิกเลือก</p>
                <p className="mt-1 text-[14px] text-[var(--text-muted)]">JPG, PNG, WEBP · สูงสุด 8MB</p>
              </div>
            </div>
          )}
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={ctx.handleFileChange}
            type="file"
          />
        </label>

        {/* Action bar */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-[13px] text-[var(--text-muted)] truncate">
            {ctx.selectedFile
              ? `${ctx.selectedFile.name} · ${(ctx.selectedFile.size / 1024).toFixed(0)} KB`
              : "ยังไม่ได้เลือกไฟล์"}
          </p>
          <button
            className="primary-button"
            disabled={!ctx.selectedFile || ctx.isProcessing}
            onClick={ctx.processSlip}
            type="button"
          >
            <Bot size={15} />
            {ctx.isProcessing ? "กำลังอ่าน…" : "อ่านสลิป"}
          </button>
        </div>
      </div>

      {/* Right: Review panel */}
      <ReviewPanel ctx={ctx} />
    </div>
  );
}

function ReviewPanel({ ctx }: { ctx: AppCtx }) {
  const slip = ctx.extractedSlip;

  return (
    <form className="surface p-6 sm:p-7" onSubmit={ctx.saveTransaction}>
      <div className="flex items-center gap-2 mb-5">
        <CheckCircle2 size={16} className="text-[var(--text-muted)]" />
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Review & save
        </h3>
      </div>

      {slip ? (
        <>
          {/* AI facts */}
          <div className="space-y-2.5 mb-5">
            {slip.amount != null && (
              <FactRow label="จำนวนเงิน" value={`฿${slip.amount.toLocaleString("th-TH")}`} />
            )}
            {slip.bankName && <FactRow label="ธนาคาร" value={slip.bankName} />}
            {slip.receiverName && <FactRow label="ผู้รับ" value={slip.receiverName} />}
            {slip.referenceNo && <FactRow label="เลขอ้างอิง" value={slip.referenceNo} mono />}
            {slip.transactionDateIso && <FactRow label="วันที่" value={slip.transactionDateIso} />}
          </div>

          {/* Confidence badge */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
              slip.confidence >= 0.75
                ? "bg-[var(--gold-dim)] text-[var(--gold)]"
                : "bg-[var(--expense-soft)] text-[var(--expense)]"
            }`}
          >
            {slip.confidence >= 0.75 ? <CheckCircle2 size={11} /> : "⚠"}
            AI confidence {Math.round(slip.confidence * 100)}%
          </div>

          <hr className="divider my-5" />

          {/* Transaction type */}
          <div className="mb-4">
            <label className="block mb-1.5 text-[11px] font-semibold text-[var(--text-muted)]">ประเภทรายการ</label>
            <TypeSelector
              value={ctx.draft.type}
              onChange={(type) => ctx.setDraft({ ...ctx.draft, type, categoryName: type === "income" ? "รายได้" : "บิล/บริการ" })}
            />
          </div>

          {/* Editable fields */}
          <div className="space-y-3.5">
            <Field label="รายการ">
              <input
                className="field"
                onChange={(e) => ctx.setDraft({ ...ctx.draft, title: e.target.value })}
                placeholder="ค่าบริการ..."
                value={ctx.draft.title}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="จำนวนเงิน">
                <input
                  className="field font-figures"
                  inputMode="decimal"
                  onChange={(e) => ctx.setDraft({ ...ctx.draft, amount: e.target.value })}
                  value={ctx.draft.amount}
                />
              </Field>
              <Field label="ค่าธรรมเนียม">
                <input
                  className="field font-figures"
                  inputMode="decimal"
                  onChange={(e) => ctx.setDraft({ ...ctx.draft, fee: e.target.value })}
                  value={ctx.draft.fee}
                />
              </Field>
            </div>
            <Field label="หมวดหมู่">
              <select
                className="field"
                onChange={(e) => ctx.setDraft({ ...ctx.draft, categoryName: e.target.value })}
                value={ctx.draft.categoryName}
              >
                {(ctx.draft.type === "income" ? incomeCategories : expenseCategories).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="วันที่">
              <input
                className="field font-figures"
                type="date"
                onChange={(e) => ctx.setDraft({ ...ctx.draft, transactionDate: e.target.value })}
                value={ctx.draft.transactionDate}
              />
              {slip?.transactionDateIso &&
                slip.transactionDateIso.slice(0, 4) !== new Date().getFullYear().toString() && (
                <p className="mt-1.5 text-[11px] text-[var(--expense)]">
                  ⚠ AI อ่านปี {slip.transactionDateIso.slice(0, 4)} — ตรวจสอบก่อนบันทึก
                </p>
              )}
            </Field>
          </div>

          <div className="mt-6 flex gap-2.5">
            <button className="primary-button flex-1 justify-center" type="submit">
              <CheckCircle2 size={15} />
              ยืนยันบันทึก
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                ctx.setDraft({ type: "expense", amount: "", fee: "0", title: "", categoryName: "บิล/บริการ", transactionDate: todayBangkokDate(), transactionTime: "" });
              }}
            >
              ล้าง
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <ScanLine size={32} className="text-[var(--text-disabled)]" />
          <p className="text-[15px] text-[var(--text-muted)]">อัปโหลดสลิปแล้วกด "อ่านสลิป" เพื่อให้ AI ดึงข้อมูล</p>
          <p className="text-[13px] text-[var(--text-disabled)]">หรือสลับไปโหมด "กรอกเอง" หากไม่มีสลิป</p>
        </div>
      )}
    </form>
  );
}

function ManualMode({ ctx }: { ctx: AppCtx }) {
  const emptyLocal = () => ({
    type: "expense" as "income" | "expense" | "transfer",
    amount: "",
    fee: "0",
    title: "",
    categoryName: "อาหาร",
    transactionDate: todayBangkokDate(),
    transactionTime: "",
  });
  const [localDraft, setLocalDraft] = useState(emptyLocal);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const cats = localDraft.type === "income" ? incomeCategories : expenseCategories;

  function showToast(type: "ok" | "err", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseAmount(localDraft.amount);
    const fee = parseAmount(localDraft.fee) ?? 0;
    if (!amount || amount <= 0) { showToast("err", "กรอกจำนวนเงินให้ถูกต้อง"); return; }
    if (!localDraft.title.trim()) { showToast("err", "กรอกชื่อรายการด้วย"); return; }

    setSaving(true);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          type: localDraft.type,
          amount,
          fee,
          title: localDraft.title.trim(),
          categoryName: localDraft.categoryName,
          transactionDate: localDraft.transactionDate,
          transactionTime: localDraft.transactionTime || null,
        }),
      });
      const data = (await res.json()) as { ok: boolean; transaction?: unknown; error?: string };
      if (res.ok && data.ok && data.transaction) {
        ctx.setDraft(ctx.draft); // trigger re-fetch in parent
        setLocalDraft(emptyLocal());
        showToast("ok", "บันทึกเรียบร้อย");
        setTimeout(() => window.location.reload(), 800);
      } else {
        showToast("err", res.status === 403 ? "Session หมดอายุ กรุณา refresh" : (data.error ?? "บันทึกไม่สำเร็จ"));
      }
    } catch {
      showToast("err", "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="surface p-6 sm:p-7 max-w-xl relative">
      {toast && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium shadow-lg transition-all animate-in ${
          toast.type === "ok"
            ? "bg-[var(--gold-dim)] text-[var(--gold)] border border-[var(--gold)]/20"
            : "bg-[var(--expense-soft)] text-[var(--expense)] border border-[var(--expense)]/20"
        }`}>
          {toast.type === "ok" ? <CheckCircle2 size={14} /> : "⚠"}
          {toast.msg}
        </div>
      )}
      <div className="flex items-center gap-2 mb-6">
        <FileText size={16} className="text-[var(--text-muted)]" />
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Manual entry
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1.5 text-[11px] font-semibold text-[var(--text-muted)]">ประเภทรายการ</label>
          <TypeSelector
            value={localDraft.type}
            onChange={(type) => setLocalDraft({ ...localDraft, type, categoryName: cats[0] })}
          />
        </div>

        <Field label="รายการ">
          <input
            className="field"
            placeholder="ค่าอาหารกลางวัน..."
            value={localDraft.title}
            onChange={(e) => setLocalDraft({ ...localDraft, title: e.target.value })}
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="จำนวนเงิน">
            <input
              className="field font-figures"
              inputMode="decimal"
              placeholder="0.00"
              value={localDraft.amount}
              onChange={(e) => setLocalDraft({ ...localDraft, amount: e.target.value })}
              required
            />
          </Field>
          <Field label="ค่าธรรมเนียม">
            <input
              className="field font-figures"
              inputMode="decimal"
              value={localDraft.fee}
              onChange={(e) => setLocalDraft({ ...localDraft, fee: e.target.value })}
            />
          </Field>
        </div>

        <Field label="หมวดหมู่">
          <select
            className="field"
            value={localDraft.categoryName}
            onChange={(e) => setLocalDraft({ ...localDraft, categoryName: e.target.value })}
          >
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="วันที่">
          <input
            className="field font-figures"
            type="date"
            value={localDraft.transactionDate}
            onChange={(e) => setLocalDraft({ ...localDraft, transactionDate: e.target.value })}
            required
          />
        </Field>

        <div className="pt-2">
          <button className="primary-button w-full justify-center" type="submit" disabled={saving}>
            <CheckCircle2 size={15} />
            {saving ? "กำลังบันทึก…" : "บันทึกรายการ"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TypeSelector({ value, onChange }: { value: string; onChange: (v: "income" | "expense" | "transfer") => void }) {
  return (
    <div className="type-selector">
      <button
        className={`type-selector-btn ${value === "expense" ? "is-active-expense" : ""}`}
        onClick={() => onChange("expense")}
        type="button"
      >
        รายจ่าย
      </button>
      <button
        className={`type-selector-btn ${value === "income" ? "is-active-income" : ""}`}
        onClick={() => onChange("income")}
        type="button"
      >
        รายรับ
      </button>
      <button
        className={`type-selector-btn ${value === "transfer" ? "is-active-transfer" : ""}`}
        onClick={() => onChange("transfer")}
        type="button"
      >
        โอนเงิน
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-[11px] font-semibold text-[var(--text-muted)]">{label}</span>
      {children}
    </label>
  );
}

function FactRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className={`font-medium text-[var(--text-primary)] ${mono ? "font-figures" : ""}`}>
        {value}
      </span>
    </div>
  );
}
