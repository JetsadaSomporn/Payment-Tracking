"use client";

import { Bot, CheckCircle2, FileCheck2, ScanLine, ShieldCheck, UploadCloud } from "lucide-react";
import type { AppCtx } from "@/components/payment-tracker-app";

export default function UploadView({ ctx }: { ctx: AppCtx }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
      {/* ── Left: Upload zone ───────────────────────────────────────────── */}
      <div className="surface p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Upload slip
          </h3>
        </div>

        {/* Progress steps */}
        <div className="flex gap-1.5">
          {[
            { done: Boolean(ctx.selectedFile), label: "File" },
            { done: Boolean(ctx.extractedSlip), label: "Read" },
            { done: false, label: "Confirm" },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all ${
                s.done
                  ? "border-[var(--gold)]/30 bg-[var(--gold-dim)] text-[var(--gold)]"
                  : "border-[var(--border-subtle)] text-[var(--text-disabled)]"
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Drop zone */}
        <label className="upload-stage mt-4 flex min-h-[280px] flex-col items-center justify-center p-4 sm:p-6 sm:min-h-[380px] text-center cursor-pointer">
          {ctx.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Slip preview"
              className="max-h-[340px] rounded-lg object-contain"
              src={ctx.previewUrl}
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="grid size-14 place-items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-muted)]">
                <UploadCloud size={22} />
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">วางสลิปที่นี่ หรือคลิกเลือก</p>
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">JPG, PNG, WEBP · สูงสุด 8MB</p>
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
        <div className="mt-4 flex items-center justify-between gap-3">
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

      {/* ── Right: Review panel ──────────────────────────────────────────── */}
      <form className="surface p-5 sm:p-6" onSubmit={ctx.saveTransaction}>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={16} className="text-[var(--text-muted)]" />
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Review
          </h3>
        </div>

        {ctx.extractedSlip ? (
          <>
            {/* AI extracted facts */}
            <div className="space-y-2 mb-4">
              {ctx.extractedSlip.amount && (
                <FactRow label="จำนวนเงิน" value={`฿${ctx.extractedSlip.amount.toLocaleString("th-TH")}`} />
              )}
              {ctx.extractedSlip.bankName && <FactRow label="ธนาคาร" value={ctx.extractedSlip.bankName} />}
              {ctx.extractedSlip.receiverName && <FactRow label="ผู้รับ" value={ctx.extractedSlip.receiverName} />}
              {ctx.extractedSlip.referenceNo && <FactRow label="เลขอ้างอิง" value={ctx.extractedSlip.referenceNo} mono />}
              {ctx.extractedSlip.transactionDateIso && (
                <FactRow label="วันที่" value={ctx.extractedSlip.transactionDateIso} />
              )}
            </div>

            {/* Confidence badge */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                ctx.extractedSlip.confidence >= 0.75
                  ? "bg-[var(--gold-dim)] text-[var(--gold)]"
                  : "bg-[rgba(244,63,94,0.12)] text-[var(--expense)]"
              }`}
            >
              AI {ctx.extractedSlip.confidence >= 0.75 ? "✓" : "!"} {Math.round(ctx.extractedSlip.confidence * 100)}%
            </div>

            <hr className="divider my-4" />

            {/* Editable fields */}
            <div className="space-y-3">
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
                  {["อาหาร", "บิล/บริการ", "เดินทาง", "ช้อปปิ้ง", "สุขภาพ", "การศึกษา", "ความบันเทิง", "อื่น ๆ"].map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ),
                  )}
                </select>
              </Field>
            </div>

            <div className="mt-5 flex gap-2">
              <button className="primary-button flex-1 justify-center" type="submit">
                <CheckCircle2 size={15} />
                ยืนยันบันทึก
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  ctx.setDraft({ type: "expense", amount: "", fee: "0", title: "", categoryName: "บิล/บริการ", transactionDate: "", transactionTime: "" });
                }}
              >
                ล้าง
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <ScanLine size={28} className="text-[var(--text-disabled)]" />
            <p className="text-sm text-[var(--text-muted)]">อัปโหลดสลิปแล้วกด "อ่านสลิป" เพื่อให้ AI ดึงข้อมูล</p>
          </div>
        )}
      </form>
    </section>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1 text-[11px] font-medium text-[var(--text-muted)]">{label}</span>
      {children}
    </label>
  );
}
