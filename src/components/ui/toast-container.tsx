"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { useToast } from "@/providers/toast-provider";

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: {
    border: "border-[var(--income)]/20",
    bg: "bg-[var(--income-soft)]",
    text: "text-[var(--income)]",
  },
  error: {
    border: "border-[var(--expense)]/20",
    bg: "bg-[var(--expense-soft)]",
    text: "text-[var(--expense)]",
  },
  warning: {
    border: "border-[var(--gold)]/20",
    bg: "bg-[var(--gold-dim)]",
    text: "text-[var(--gold)]",
  },
  info: {
    border: "border-[var(--text-secondary)]/15",
    bg: "bg-[var(--soft)]",
    text: "text-[var(--text-secondary)]",
  },
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2.5 w-[min(380px,calc(100vw-32px))]">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: { id: string; type: keyof typeof icons; title?: string; message: string; duration?: number };
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const Icon = icons[toast.type];
  const style = styles[toast.type];
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    const enter = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onClose, 350);
    }, duration);
    return () => {
      cancelAnimationFrame(enter);
      clearTimeout(timer);
    };
  }, [duration, onClose]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${style.border} bg-[var(--panel)] shadow-xl backdrop-blur-xl transition-all duration-300 ease-out ${
        visible && !exiting
          ? "translate-x-0 opacity-100"
          : exiting
          ? "translate-x-4 opacity-0"
          : "translate-x-8 opacity-0"
      }`}
    >
      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-[2px] bg-current opacity-30"
        style={{
          width: "100%",
          animation: `shrink ${duration}ms linear forwards`,
          color: "inherit",
        }}
      />

      <div className="flex items-start gap-3 p-4 pr-10">
        <div className={`mt-0.5 shrink-0 rounded-full p-1 ${style.bg}`}>
          <Icon size={14} className={style.text} />
        </div>
        <div className="min-w-0 flex-1">
          {toast.title && (
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">{toast.title}</p>
          )}
          <p className={`text-[13px] leading-relaxed text-[var(--text-secondary)] ${toast.title ? "mt-0.5" : ""}`}>
            {toast.message}
          </p>
        </div>
      </div>

      <button
        onClick={() => {
          setExiting(true);
          setTimeout(onClose, 350);
        }}
        className="absolute top-3 right-3 rounded-md p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--soft)] transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
