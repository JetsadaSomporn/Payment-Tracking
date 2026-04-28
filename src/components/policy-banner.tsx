"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, X } from "lucide-react";

const STORAGE_KEY = "spendly-policy-accepted-v1";

export default function PolicyBanner() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) {
      // Delay slightly for better UX
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setVisible(false);
  }

  if (!mounted || !visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] z-[90] mb-[56px] lg:mb-0 lg:bottom-4 px-4">
      <div className="mx-auto max-w-xl animate-in">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-2xl shadow-xl p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--soft)] text-[var(--gold)]">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                ความเป็นส่วนตัวและข้อกำหนดการใช้งาน
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
                เราเก็บข้อมูลธุรกรรมของคุณอย่างปลอดภัยด้วยการเข้ารหัส AES-256 
                และไม่แชร์ข้อมูลกับบุคคลที่สาม โดยใช้คุกกี้เพื่อพัฒนาประสบการณ์การใช้งาน
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={accept}
                  className="primary-button text-[13px] px-4 py-2"
                  type="button"
                >
                  ยอมรับและใช้งานต่อ
                </button>
                <Link
                  href="/p"
                  className="ghost-button text-[13px] px-3 py-2"
                >
                  นโยบายความเป็นส่วนตัว
                </Link>
                <Link
                  href="/e"
                  className="ghost-button text-[13px] px-3 py-2"
                >
                  ข้อกำหนด
                </Link>
              </div>
            </div>
            <button
              onClick={accept}
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--soft)] transition-colors shrink-0"
              title="ปิด"
              type="button"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
