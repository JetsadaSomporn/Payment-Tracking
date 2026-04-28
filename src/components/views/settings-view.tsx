"use client";

import { useState, useEffect } from "react";
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
  Sliders,
  Key,
  Fingerprint,
  AlertTriangle,
  Clock,
  Server,
  Globe,
  Bell,
  Eye,
  EyeOff,
  HardDrive,
  Zap,
} from "lucide-react";
import type { AppCtx } from "@/components/payment-tracker-app";

export function SettingsView({ ctx }: { ctx: AppCtx }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("spendly-theme");
    if (stored === "light") setTheme("light");
    else if (stored === "dark" || !stored) setTheme("dark");
    else setTheme("system");
  }, []);

  async function handleSignOut() {
    const { getBrowserSupabaseClient } = await import("@/lib/supabase/client");
    const supabase = getBrowserSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.reload();
  }

  function handleThemeChange(t: "dark" | "light" | "system") {
    setTheme(t);
    if (t === "system") {
      localStorage.removeItem("spendly-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        document.documentElement.removeAttribute("data-theme");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
      }
    } else {
      localStorage.setItem("spendly-theme", t === "light" ? "light" : "dark");
      if (t === "light") {
        document.documentElement.setAttribute("data-theme", "light");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
    }
  }

  const synced = ctx.hasSupabase && ctx.isAuthenticated;

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
            <button
              className="secondary-button text-[13px] gap-2 shrink-0"
              onClick={handleSignOut}
              type="button"
            >
              <LogOut size={14} />
              Sign out
            </button>
          ) : (
            <button
              className="primary-button text-[13px] gap-2 shrink-0"
              onClick={ctx.handleGoogleLogin}
              type="button"
            >
              <LogIn size={14} />
              Sign in
            </button>
          )}
        </div>
      </Section>

      {/* ── Appearance ── */}
      <Section title="Appearance" icon={<Eye size={15} />}>
        <div className="surface overflow-hidden divide-y divide-[var(--border-subtle)]">
          {/* Theme */}
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

          {/* Reduced motion */}
          <SettingRow
            label="Reduced motion"
            description="Disable animations and transitions"
            right={
              <ToggleSwitch
                checked={false}
                onChange={() => {}}
                label="Reduced motion"
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
              <ToggleSwitch checked={true} onChange={() => {}} label="Auto-categorize" />
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
                DeepSeek V4
              </span>
              <ChevronRight size={13} className="text-[var(--text-disabled)]" />
            </div>
          </div>

          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-[14px] text-[var(--text-secondary)]">Confidence threshold</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Warn below this level</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-figures text-[var(--text-muted)]">75%</span>
              <ChevronRight size={13} className="text-[var(--text-disabled)]" />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Data & Privacy ── */}
      <Section title="Data & Privacy" icon={<Database size={15} />}>
        <div className="surface overflow-hidden divide-y divide-[var(--border-subtle)]">
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-[14px] text-[var(--text-secondary)]">Storage used</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Encrypted on Supabase</p>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive size={13} className="text-[var(--text-muted)]" />
              <span className="text-[13px] font-figures text-[var(--text-muted)]">&lt; 1 MB</span>
            </div>
          </div>

          <button
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[var(--bg-elevated)] transition-colors"
            type="button"
          >
            <div className="flex items-center gap-3">
              <FileDown size={15} className="text-[var(--text-muted)] shrink-0" />
              <div>
                <p className="text-[14px]">Export all data</p>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Download as CSV</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          </button>

          <div className="px-5 py-3.5">
            {!confirmDelete ? (
              <button
                className="w-full flex items-center justify-between text-left hover:bg-[var(--bg-elevated)] transition-colors -mx-5 px-5 py-3.5"
                onClick={() => setConfirmDelete(true)}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <Trash2 size={15} className="text-[var(--expense)] shrink-0" />
                  <div>
                    <p className="text-[14px] text-[var(--expense)]">Delete all data</p>
                    <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                      Permanently remove all transactions and slips
                    </p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="rounded-lg border border-[var(--expense)]/30 bg-[var(--expense)]/5 p-3.5">
                <div className="flex items-start gap-2.5 mb-3">
                  <AlertTriangle size={15} className="text-[var(--expense)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[14px] font-semibold text-[var(--expense)]">
                      Are you sure?
                    </p>
                    <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                      This action cannot be undone. All your transactions, slips, and summaries will be permanently deleted.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded-lg bg-[var(--expense)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 transition-opacity"
                    type="button"
                  >
                    Yes, delete everything
                  </button>
                  <button
                    className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                    onClick={() => setConfirmDelete(false)}
                    type="button"
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
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-[14px] text-[var(--text-secondary)]">Encryption</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">AES-256-GCM at rest</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--income)]" />
              <span className="text-[13px] text-[var(--income)] font-medium">Active</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-[14px] text-[var(--text-secondary)]">Tamper detection</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">HMAC-SHA256 row signing</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--income)]" />
              <span className="text-[13px] text-[var(--income)] font-medium">Active</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-[14px] text-[var(--text-secondary)]">CSRF Protection</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Double-submit cookie pattern</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--income)]" />
              <span className="text-[13px] text-[var(--income)] font-medium">Active</span>
            </div>
          </div>

          <SettingRow
            label="Session"
            description={synced ? "Google OAuth · Active" : "Not signed in"}
            right={
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${synced ? "bg-[var(--income)]" : "bg-[var(--text-disabled)]"}`} />
                <span className={`text-[13px] ${synced ? "text-[var(--income)]" : "text-[var(--text-muted)]"}`}>
                  {synced ? "Secure" : "Offline"}
                </span>
              </div>
            }
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
            <span className="text-[12px] text-[var(--text-muted)]">
              {ctx.isAuthenticated ? "Google" : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-[14px] text-[var(--text-secondary)]">Connected account</p>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                {ctx.isAuthenticated ? "Google OAuth 2.0" : "None"}
              </p>
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
          <Link
            href="/p"
            className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <span className="text-[14px] text-[var(--text-secondary)]">Privacy Policy</span>
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          </Link>
          <Link
            href="/e"
            className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--bg-elevated)] transition-colors"
          >
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

/* ── Shared sub-components ── */

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
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

function SettingRow({
  label,
  description,
  right,
}: {
  label: string;
  description: string;
  right: React.ReactNode;
}) {
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

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
        checked ? "bg-[var(--accent)]" : "bg-[var(--bg-field)] border border-[var(--border-subtle)]"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}
