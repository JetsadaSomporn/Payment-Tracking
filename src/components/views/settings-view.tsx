"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronRight,
  FileDown,
  LogOut,
  LogIn,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  Trash2,
  Database,
  Brain,
  Zap,
  AlertTriangle,
  HardDrive,
  Globe,
  Key,
  Fingerprint,
  Server,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { AppCtx } from "@/components/payment-tracker-app";

type Preferences = {
  aiModel: string;
  aiConfidence: number;
  autoCategorize: boolean;
  reducedMotion: boolean;
};

const DEFAULT_PREFS: Preferences = {
  aiModel: "deepseek-v4-flash",
  aiConfidence: 0.75,
  autoCategorize: true,
  reducedMotion: false,
};

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match?.[1] ?? "";
}

export function SettingsView({ ctx }: { ctx: AppCtx }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ── Load preferences from API ──────────────────────────────────────────
  useEffect(() => {
    if (!ctx.isAuthenticated) {
      setPrefsLoaded(true);
      return;
    }

    fetch("/api/preferences", {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.preferences && typeof data.preferences === "object") {
          setPrefs({ ...DEFAULT_PREFS, ...data.preferences });
        }
      })
      .catch(() => {})
      .finally(() => setPrefsLoaded(true));
  }, [ctx.isAuthenticated]);

  // ── Apply reduced motion ───────────────────────────────────────────────
  useEffect(() => {
    if (prefs.reducedMotion) {
      document.documentElement.classList.add("reduce-motion");
    } else {
      document.documentElement.classList.remove("reduce-motion");
    }
  }, [prefs.reducedMotion]);

  // ── Load saved theme ───────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("spendly-theme");
    if (stored === "light") setTheme("light");
    else if (stored === "dark" || !stored) setTheme("dark");
    else setTheme("system");
  }, []);

  // ── Save preference to API ─────────────────────────────────────────────
  const savePref = useCallback(
    async (key: keyof Preferences, value: unknown) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));

      if (!ctx.isAuthenticated) return; // guest mode — local only

      try {
        await fetch("/api/preferences", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": getCsrfToken(),
          },
          credentials: "include",
          body: JSON.stringify({ [key]: value }),
        });
      } catch {
        // Rollback on network error
        setPrefs((prev) => ({ ...prev, [key]: prev[key] }));
      }
    },
    [ctx.isAuthenticated],
  );

  // ── Sign out ───────────────────────────────────────────────────────────
  async function handleSignOut() {
    const { getBrowserSupabaseClient } = await import("@/lib/supabase/client");
    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      window.location.href = "/";
      return;
    }

    await supabase.auth.signOut();

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/signout";
    document.body.appendChild(form);
    form.submit();
  }

  // ── Theme ──────────────────────────────────────────────────────────────
  function handleThemeChange(t: "dark" | "light" | "system") {
    setTheme(t);
    if (t === "system") {
      localStorage.removeItem("spendly-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.toggleAttribute("data-theme", !prefersDark);
    } else {
      localStorage.setItem("spendly-theme", t === "light" ? "light" : "dark");
      document.documentElement.toggleAttribute("data-theme", t === "light");
    }
  }

  // ── Export CSV ─────────────────────────────────────────────────────────
  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch("/api/export", { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spendly-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  // ── Delete all data ────────────────────────────────────────────────────
  async function handleDeleteAll() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/transactions/delete-all", {
        method: "DELETE",
        headers: { "x-csrf-token": getCsrfToken() },
        credentials: "include",
      });
      if (res.ok) {
        window.location.reload();
      } else {
        setDeleting(false);
        setConfirmDelete(false);
      }
    } catch {
      setDeleting(false);
    }
  }

  const synced = ctx.hasSupabase && ctx.isAuthenticated;
  const txCount = ctx.transactions.length;

  return (
    <div className="max-w-xl space-y-5 animate-in pb-8">
      {/* ── Profile ── */}
      <Section title="Profile">
        <div className="surface p-5 flex items-center gap-4">
          {ctx.userMeta?.avatar_url ? (
            <img
              src={ctx.userMeta.avatar_url}
              alt=""
              className="w-14 h-14 rounded-full border-2 border-[var(--border-subtle)] object-cover shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[var(--gold)] text-[#0A0A0C] flex items-center justify-center text-xl font-bold shrink-0">
              {ctx.isAuthenticated ? (ctx.authLabel?.charAt(0)?.toUpperCase() ?? "U") : "?"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold truncate">
              {ctx.userMeta?.full_name || (ctx.isAuthenticated ? "User" : "Guest")}
            </p>
            <p className="text-[13px] text-[var(--text-muted)] truncate mt-0.5">
              {ctx.isAuthenticated ? ctx.authLabel : "ยังไม่ได้เข้าสู่ระบบ"}
            </p>
          </div>
          {ctx.isAuthenticated ? (
            <button className="secondary-button text-[13px] gap-2 shrink-0" onClick={handleSignOut} type="button">
              <LogOut size={14} /> Sign out
            </button>
          ) : (
            <button className="primary-button text-[13px] gap-2 shrink-0" onClick={ctx.handleGoogleLogin} type="button">
              <LogIn size={14} /> Sign in
            </button>
          )}
        </div>
      </Section>

      {/* ── Appearance ── */}
      <Section title="Appearance" icon={<Sun size={15} />}>
        <div className="surface overflow-hidden divide-y divide-[var(--border-subtle)]">
          <div className="px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] text-[var(--text-secondary)]">Theme</p>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                  {theme === "dark" ? "Dark mode" : theme === "light" ? "Light mode" : "Follow system"}
                </p>
              </div>
              <div className="flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-field)] p-0.5">
                {([
                  ["dark", <Moon size={13} key="m" />],
                  ["light", <Sun size={13} key="s" />],
                  ["system", <Monitor size={13} key="mo" />],
                ] as const).map(([t, icon]) => (
                  <button
                    key={t}
                    onClick={() => handleThemeChange(t)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] transition-all ${
                      theme === t
                        ? "bg-[var(--panel)] text-[var(--foreground)] shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    {icon}
                    {t === "dark" ? "Dark" : t === "light" ? "Light" : "Auto"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <SettingRow
            label="Reduced motion"
            description="Disable animations and transitions"
            right={
              <ToggleSwitch
                checked={prefs.reducedMotion}
                onChange={(v) => savePref("reducedMotion", v)}
                label="Reduced motion"
                disabled={!prefsLoaded}
              />
            }
          />
        </div>
      </Section>

      {/* ── AI & Automation ── */}
      <Section title="AI & Automation" icon={<Brain size={15} />}>
        <div className="surface overflow-hidden divide-y divide-[var(--border-subtle)]">
          <SettingRow
            label="Auto-categorize"
            description="Automatically assign categories from slip OCR"
            right={
              <ToggleSwitch
                checked={prefs.autoCategorize}
                onChange={(v) => savePref("autoCategorize", v)}
                label="Auto-categorize"
                disabled={!prefsLoaded}
              />
            }
          />

          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-[14px] text-[var(--text-secondary)]">AI Model</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Slip extraction engine</p>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={13} className="text-[var(--gold)]" />
              <span className="text-[13px] font-figures text-[var(--text-muted)]">
                {prefs.aiModel === "deepseek-v4-flash" ? "DeepSeek V4 Flash" : prefs.aiModel}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-[14px] text-[var(--text-secondary)]">Confidence threshold</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Warn below this level</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-figures text-[var(--text-muted)]">
                {Math.round(prefs.aiConfidence * 100)}%
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Data & Privacy ── */}
      <Section title="Data & Privacy" icon={<Database size={15} />}>
        <div className="surface overflow-hidden divide-y divide-[var(--border-subtle)]">
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-[14px] text-[var(--text-secondary)]">Transactions</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                {synced ? "Synced to Supabase" : "Stored locally"}
              </p>
            </div>
            <span className="text-[13px] font-figures text-[var(--text-muted)]">
              {txCount.toLocaleString()} records
            </span>
          </div>

          <button
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-40"
            type="button"
            onClick={handleExport}
            disabled={exporting || txCount === 0}
          >
            <div className="flex items-center gap-3">
              {exporting ? (
                <Loader2 size={15} className="animate-spin text-[var(--text-muted)] shrink-0" />
              ) : (
                <FileDown size={15} className="text-[var(--text-muted)] shrink-0" />
              )}
              <div>
                <p className="text-[14px]">{exporting ? "Exporting..." : "Export all data"}</p>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Download as CSV (UTF-8)</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          </button>

          <div className="px-5 py-3.5">
            {!confirmDelete ? (
              <button
                className="w-full flex items-center text-left hover:bg-[var(--bg-elevated)] transition-colors -mx-5 px-5 py-3.5"
                onClick={() => setConfirmDelete(true)}
                type="button"
                disabled={!synced}
              >
                <div className="flex items-center gap-3">
                  <Trash2 size={15} className="text-[var(--expense)] shrink-0" />
                  <div>
                    <p className="text-[14px] text-[var(--expense)]">Delete all data</p>
                    <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                      {synced
                        ? "Permanently remove all transactions and slips"
                        : "Sign in to manage cloud data"}
                    </p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="rounded-lg border border-[var(--expense)]/30 bg-[var(--expense)]/5 p-3.5">
                <div className="flex items-start gap-2.5 mb-3">
                  <AlertTriangle size={15} className="text-[var(--expense)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[14px] font-semibold text-[var(--expense)]">Are you sure?</p>
                    <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                      This permanently deletes all {txCount.toLocaleString()} transactions, slips, and summaries. This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded-lg bg-[var(--expense)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    type="button"
                    onClick={handleDeleteAll}
                    disabled={deleting}
                  >
                    {deleting && <Loader2 size={13} className="animate-spin" />}
                    {deleting ? "Deleting..." : "Yes, delete everything"}
                  </button>
                  <button
                    className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
                    onClick={() => setConfirmDelete(false)}
                    type="button"
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ── Security ── */}
      <Section title="Security" icon={<Fingerprint size={15} />}>
        <div className="surface overflow-hidden divide-y divide-[var(--border-subtle)]">
          <StatusRow label="Encryption" desc="AES-256-GCM at rest" active />
          <StatusRow label="Tamper detection" desc="HMAC-SHA256 row signing" active />
          <StatusRow label="CSRF Protection" desc="Double-submit cookie pattern" active />
          <StatusRow
            label="Session"
            desc={synced ? "Google OAuth · Active" : "Not signed in"}
            active={synced}
          />
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-[14px] text-[var(--text-secondary)]">Cloud sync</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Supabase PostgreSQL</p>
            </div>
            <div className="flex items-center gap-2">
              <Server size={13} className="text-[var(--text-muted)]" />
              <span className={`text-[13px] ${synced ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"}`}>
                {synced ? "Connected" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Account ── */}
      <Section title="Account" icon={<Key size={15} />}>
        <div className="surface overflow-hidden divide-y divide-[var(--border-subtle)]">
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-[14px] text-[var(--text-secondary)]">Email</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5 truncate max-w-[220px]">
                {ctx.isAuthenticated ? ctx.authLabel : "Not signed in"}
              </p>
            </div>
            <span className="text-[12px] text-[var(--text-muted)]">{ctx.isAuthenticated ? "Google" : "—"}</span>
          </div>

          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-[14px] text-[var(--text-secondary)]">Connected account</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{ctx.isAuthenticated ? "Google OAuth 2.0" : "None"}</p>
            </div>
            <Globe size={14} className="text-[var(--text-muted)]" />
          </div>

          {ctx.isAuthenticated && (
            <button
              className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[var(--bg-elevated)] transition-colors"
              onClick={handleSignOut}
              type="button"
            >
              <div className="flex items-center gap-3">
                <LogOut size={15} className="text-[var(--text-muted)] shrink-0" />
                <span className="text-[14px]">Sign out</span>
              </div>
              <ChevronRight size={14} className="text-[var(--text-muted)]" />
            </button>
          )}
        </div>
      </Section>

      {/* ── Legal ── */}
      <Section title="Legal" icon={<ShieldCheck size={15} />}>
        <div className="surface overflow-hidden divide-y divide-[var(--border-subtle)]">
          <Link href="/p" className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--bg-elevated)] transition-colors">
            <span className="text-[14px] text-[var(--text-secondary)]">Privacy Policy</span>
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          </Link>
          <Link href="/e" className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--bg-elevated)] transition-colors">
            <span className="text-[14px] text-[var(--text-secondary)]">Terms of Service</span>
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          </Link>
        </div>
      </Section>

      {/* ── About ── */}
      <Section title="About">
        <div className="surface overflow-hidden divide-y divide-[var(--border-subtle)]">
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[14px] text-[var(--text-secondary)]">App</span>
            <span className="text-[13px] text-[var(--text-muted)]">Spendly</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[14px] text-[var(--text-secondary)]">Version</span>
            <span className="text-[13px] font-figures text-[var(--text-muted)]">v0.1.0</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[14px] text-[var(--text-secondary)]">Security</span>
            <div className="flex items-center gap-1.5 text-[var(--income)]">
              <ShieldCheck size={13} />
              <span className="text-[13px]">Secured</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[14px] text-[var(--text-secondary)]">Currency</span>
            <span className="text-[13px] text-[var(--text-muted)]">Thai Baht (฿)</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[14px] text-[var(--text-secondary)]">Timezone</span>
            <span className="text-[13px] text-[var(--text-muted)]">Asia/Bangkok (UTC+7)</span>
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ── Sub-components ── */

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] flex items-center gap-2">
        {icon && <span className="text-[var(--text-muted)]">{icon}</span>}
        {title}
      </p>
      {children}
    </div>
  );
}

function SettingRow({ label, description, right }: { label: string; description: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div>
        <p className="text-[14px] text-[var(--text-secondary)]">{label}</p>
        <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{description}</p>
      </div>
      {right}
    </div>
  );
}

function StatusRow({ label, desc, active }: { label: string; desc: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div>
        <p className="text-[14px] text-[var(--text-secondary)]">{label}</p>
        <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{desc}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[var(--income)]" : "bg-[var(--text-disabled)]"}`} />
        <span className={`text-[13px] ${active ? "text-[var(--income)] font-medium" : "text-[var(--text-muted)]"}`}>
          {active ? "Active" : "Inactive"}
        </span>
      </div>
    </div>
  );
}

function ToggleSwitch({
  checked, onChange, label, disabled,
}: {
  checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      } ${checked ? "bg-[var(--accent)]" : "bg-[var(--bg-field)] border border-[var(--border-subtle)]"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}
