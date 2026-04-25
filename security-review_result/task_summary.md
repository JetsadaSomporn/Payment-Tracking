# Security Audit Report — Payment Tracker

**Scan date:** 2026-04-25  
**Scope:** `/src`, `/supabase/migrations`, config files  
**OS:** macOS  
**Status:** 24 source files analyzed, 10 issues found

---

## 🔴 CRITICAL

### C1. Weak encryption fallback defaults
**File:** `src/lib/security/encryption.ts:13-14`  
**Risk:** If `INTERNAL_ENCRYPTION_SECRET` or `INTERNAL_ENCRYPTION_SALT` are not set in production `.env`, the code falls back to:
```
INTERNAL_ENCRYPTION_SECRET → "default-dev-secret-do-not-use-in-prod"
INTERNAL_ENCRYPTION_SALT   → "payment-tracker-salt"
```
**Impact:** AES-256-GCM keys derived from known values. Any attacker who gains DB access can decrypt all encrypted fields instantly.  
**Fix:** Remove default values and throw at startup if env vars are missing in production.

---

## 🟠 HIGH

### H1. CSP nonce proxy not wired
**File:** `src/proxy.ts`  
**Risk:** The `proxy()` function implements per-request CSP nonces (`'strict-dynamic'`, `'nonce-{nonce}'`) but is never exported as Next.js `middleware`. No `middleware.ts` exists in the project.  
**Impact:** CSP headers from `next.config.ts` still apply, but without per-request nonces. Script policies fall back to `'unsafe-eval' 'unsafe-inline'` which weakens XSS protection.  
**Fix:** Create `src/middleware.ts` that re-exports `proxy` as `middleware`, or inline the logic.

### H2. Auth bypass in dev mode when Supabase is unconfigured
**File:** `src/lib/supabase/server.ts:31-40`  
**Risk:** If `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing, `requireAuthenticatedUser()` returns a **fake authenticated user** with ID `00000000-0000-0000-0000-000000000000` and bypasses auth entirely.  
**Impact:** If env vars are accidentally missing in a staging/pre-production environment that still has access to real data, auth is silently bypassed.  
**Fix:** Fail closed — return `503` in all environments, not just `production`.

### H3. Financial data in localStorage
**File:** `src/components/payment-tracker-app.tsx:87,132-135`  
**Risk:** All confirmed transactions are persisted unencrypted in `localStorage` under key `payment-tracker.transactions.v1`.  
**Impact:** Any JS XSS or physical access to the device leaks full transaction history (amounts, merchants, dates).  
**Fix:** Encrypt before writing to localStorage, or move to IndexedDB with encryption. At minimum add a warning in settings.

---

## 🟡 MEDIUM

### M1. Missing RLS INSERT policy on `ai_logs`
**File:** `supabase/migrations/001_initial_schema.sql:144`  
**Risk:** `ai_logs` table only has a SELECT policy. When the app tries to insert AI audit logs, the operation will be **blocked by RLS** (returns 403 or silently fails).  
**Impact:** AI logging is non-functional. Missing audit trail for AI extraction and summary operations.  
**Fix:** Add INSERT (and optionally UPDATE) policies matching `auth.uid() = user_id`.

### M2. Rate limiter is in-memory only
**File:** `src/lib/security/api.ts:10,12-32`  
**Risk:** Rate limit state lives in a `Map` on a single Node.js process. On Vercel (serverless), each invocation gets a fresh cold start, rendering the rate limiter ineffective.  
**Impact:** API endpoints can be flooded across multiple requests hitting different serverless instances.  
**Fix:** Use Upstash Redis, Vercel KV, or database-backed rate limiting for production.

### M3. No CSRF token (origin check only)
**File:** `src/lib/security/api.ts:58-67`  
**Risk:** Same-origin check is the only CSRF protection. If an attacker controls a subdomain or exploits a misconfigured CORS proxy, the check can be bypassed.  
**Impact:** Cross-site request forgery on all POST endpoints.  
**Fix:** Add `csrf` token via Next.js server actions or a double-submit cookie pattern.

### M4. Storage path uses user ID directly
**File:** `supabase/migrations/001_initial_schema.sql:164,171,178,187`  
**Risk:** Storage bucket RLS policies use `storage.foldername(name)[1]` compared to `auth.uid()` — which means the file path structure reveals user UUIDs.  
**Impact:** Low direct risk due to RLS, but user UUIDs can be enumerated if the storage URL pattern is discovered.  
**Fix:** Consider using a hash of the user ID for folder names.

---

## 🟢 LOW

### L1. No input sanitization beyond Zod types
**Files:** `src/app/api/transactions/route.ts`, `src/app/api/summaries/daily/route.ts`  
**Risk:** Zod schemas validate types but don't sanitize for XSS payloads in `title`, `note`, `merchantName`.  
**Impact:** Low — React DOM escapes text content by default. But if data is ever rendered server-side or in email/notifications, XSS is possible.  
**Fix:** Add `strip()` or `transform()` to Zod schemas to strip HTML tags.

### L2. `authHeaders()` silently returns empty for unauthenticated users
**File:** `src/components/payment-tracker-app.tsx:885-891`  
**Risk:** When `getBrowserSupabaseClient()` returns null (no Supabase env), `authHeaders()` returns `{}` and API calls proceed without auth headers, relying on `requireAuthenticatedUser` to fall through to dev-bypass mode.  
**Impact:** Creates an invisible "unauthenticated but working" state that could slip into production.  
**Fix:** Let the client-side code handle missing auth explicitly rather than silently masking it.

---

## ✅ GOOD PRACTICES OBSERVED

| Practice | Location |
|---|---|
| Row Level Security enabled on all tables | `001_initial_schema.sql:125-132` |
| Private storage bucket (non-public) | `001_initial_schema.sql:150` |
| Magic bytes file type verification | `src/lib/security/upload.ts:19-65` |
| Timing-safe cron secret comparison | `src/app/api/cron/daily-summary/route.ts:14-26` |
| Request body size limits on all POST endpoints | `readJsonBody(maxBytes)` calls |
| CSP + HSTS + XFO + Referrer-Policy headers | `next.config.ts:24-56` |
| SRI (Subresource Integrity) enabled | `next.config.ts:22` |
| Zod schema validation on all API inputs | All route handlers |
| Same-origin check on all POST endpoints | `requireSameOrigin()` calls |
| Rate limiting (in-memory) on all write endpoints | `checkRateLimit()` calls |
| `SECURITY DEFINER` + explicit `search_path` on trigger function | `001_initial_schema.sql:195-196` |

---

## Summary

**10 issues found** (1 critical, 3 high, 4 medium, 2 low):

- The most urgent fix is **C1** — remove fallback encryption defaults.
- Next priority is wiring **H1** (middleware) and hardening **H2** (auth bypass).
- For production deployment, **M2** (stateless rate limiting) must be addressed.
- The **H3** localStorage concern depends on your threat model for client-side data.

No SQL injection, command injection, or SSRF vulnerabilities were detected. API routes consistently validate input, authenticate users, and set security headers.
