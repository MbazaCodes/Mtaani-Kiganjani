# E-MTAA (MTAANI KIGANJANI) — FULL AUDIT REPORT
**Date:** June 2026  
**Role:** Senior Full Stack Engineer, UX Designer, Security Engineer & Product Architect  
**Repo:** https://github.com/MbazaCodes/Mtaani-Kiganjani  
**Live:** https://e-mtaatz.xyz

---

## A. REPOSITORY ANALYSIS

### Project Structure
```
src/
├── app.tsx / clone-app.tsx / cloned-app-mount.tsx  ← 3-layer mount (technical debt)
├── components/
│   ├── documents/      ← 9 PDF renderers (@react-pdf/renderer)
│   ├── forms/          ← 9 multi-step service forms
│   ├── layout/         ← AppShell, Sidebar, Header, BottomNav, MobileNav
│   └── ui/             ← shadcn/ui primitives + custom components
├── context/            ← Auth, App, Language, Toast
├── data/               ← taasisi.ts (government institutions)
├── hooks/              ← useApplications, useSiteStats, usePhotoBase64
├── integrations/       ← Supabase, NIDA, TRA, Police, SMS, Payments (feature-flagged)
├── lib/                ← Supabase client, utilities, notifications, rate limiting
├── pages/
│   ├── admin/          ← 6 admin pages
│   ├── staff/          ← 7 staff pages
│   └── (citizen pages) ← 14 public/citizen pages
└── types/              ← TypeScript types
```

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Backend | Supabase (Postgres + Auth + Storage + Realtime) |
| PDF | @react-pdf/renderer (1.46MB gzipped — largest chunk) |
| Routing | React Router DOM v6 |
| Animation | Framer Motion |
| Monitoring | Sentry (optional via env var) |
| Deployment | Vercel (auto-deploy from main) |
| Mobile | Capacitor (Android configured) |

### Current Functionality
**9 Citizen Services:**
1. Utambulisho wa Mkazi (Resident Identity)
2. Kibari cha Mazishi (Burial Permit)
3. Kibari cha Sherehe (Celebration Permit)
4. Kibari cha Ujezi Mdogo (Construction Permit)
5. Barua ya Utambulisho (Introduction Letter)
6. Makubaliano ya Mauzo (Sales Agreement)
7. Makubaliano ya Pango (Rental Agreement)
8. Malipo na Michango (Payments & Contributions)
9. Migogoro na Mashauri (Disputes & Issues)

**3 Portals:** Citizen / Staff / Admin  
**6 Languages:** Swahili + English (bilingual throughout)  
**PDF Generation:** All 9 services produce signed, QR-coded PDF documents  
**Payment Flow:** Mock GEPG gateway (M-Pesa, Tigo, Airtel, Bank, Card)

---

## B. SECURITY REVIEW

### 🔴 CRITICAL Issues

**B1. Client-side rate limiting only**
- File: `src/lib/rateLimit.ts`
- Issue: Browser-based rate limiting is bypassable via DevTools. Application submissions, login attempts and form uploads have no server-side rate limiting.
- Fix: Wire `check_rate_limit()` SQL function (already in migration) into Supabase Edge Function; call from submit handlers.

**B2. Service role key architecture — CORRECT but incomplete**
- File: `src/lib/supabase-admin.ts` → `/api/admin`
- Status: ✅ Service role key is server-side only (Vercel function). Pattern is correct.
- Gap: `/api/admin` endpoint needs request logging and IP-based abuse detection.

**B3. RLS not verified on all tables**
- Migration adds RLS on `applications`, `users`, `rate_limits` but `notifications`, `agreement_notifications`, `activity_logs`, `profile_change_requests` need audit.
- Fix: Run `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'` in Supabase.

**B4. XSS risk in chart.tsx**
- File: `src/components/ui/chart.tsx:73`
- Uses `dangerouslySetInnerHTML` for CSS injection.
- Fix: Verify input is only static theme strings (not user data). Add type guard.

**B5. NIDA number logged in forms**
- Multiple forms pass full form_data to `console.error` on catch.
- NIDA numbers and personal data must never appear in error logs.
- Fix: Strip sensitive fields before logging errors.

### 🟡 MODERATE Issues

**B6. Missing Content Security Policy headers**
- vercel.json has no CSP header. XSS attacks have no browser-level defense.
- Fix: Add `Content-Security-Policy` to vercel.json headers.

**B7. Photo URLs in JWT claims not scoped**
- `photo_url` is base64 stored directly in DB rows. Large base64 data in Postgres is an anti-pattern and increases JWT payload size if included in claims.
- Fix: Enforce Supabase Storage for all photos (already started with fileStorage.ts).

**B8. Missing HTTPS enforcement**
- No redirect from HTTP to HTTPS in vercel.json.
- Fix: Add `redirects` for http → https.

---

## C. BUGS & BROKEN FEATURES

### 🔴 Critical Bugs

**C1. Payment amount always TSh 0 for some services** ✅ FIXED
**C2. Mobile signature not working** ✅ FIXED  
**C3. Citizen modal not appearing (overflow-hidden)** ✅ FIXED
**C4. React error #310 (useState in .map())** ✅ FIXED

### 🟡 Active Bugs

**C5. AnalyticsCharts RPCs not yet created in DB**
- `analytics_by_status`, `analytics_by_service`, `analytics_monthly_trend` RPCs called from AnalyticsCharts.tsx but SQL migration may not be applied yet.
- Symptom: Admin analytics charts show empty data.
- Fix: Run `supabase/migrations/20260619_scalability.sql` in Supabase SQL Editor.

**C6. `catch (_err)` referencing `error` in multiple files**
- Pattern found in `AdminLogs.tsx`, `fetchPendingProfileChanges` etc.
- Causes silent failures when the variable name doesn't match the catch parameter.
- Files: `admin/CitizenManagement.tsx:141`, `admin/AdminLogs.tsx` (multiple)

**C7. Profile.tsx is 3,557 lines — monolithic component**
- Unmaintainable, causes slow compilation and poor code splitting.
- Fix: Split into ProfilePersonal, ProfileContact, ProfileAddress, ProfileSecurity sub-components.

**C8. Agreement.tsx is 2,818 lines**
- The entire counterparty agreement workflow is in one file.
- Fix: Extract into hooks + sub-components.

**C9. useSiteStats WebSocket presence (Landing page)**
- `useSiteVisits()` returns null (disabled) but original code opened realtime channel.
- Landing page renders `siteVisits` as null without fallback text.

**C10. BottomNav ViewName type mismatch**
- BottomNav references view names like `staff_dashboard`, `application_review` etc. but these may not match the actual ViewName union type in types/index.ts.

**C11. Missing `loading` state on Supabase Storage bucket creation**
- `fileStorage.ts` silently falls back to base64 if bucket not found — no user feedback.

---

## D. PERFORMANCE ANALYSIS

### Current Bundle Sizes (Gzipped)
| Chunk | Size |
|-------|------|
| pdf (react-pdf/renderer) | **490 kB** ← biggest problem |
| admin-staff | 108 kB |
| forms | 97 kB |
| pdf-docs | 149 kB |
| supabase | 55 kB |
| react-vendor | 61 kB |
| animation (framer-motion) | 38 kB |
| **Total initial load** | **~160 kB** ✅ |

### Issues
**D1. PDF chunk (490 kB gzipped) loads for ALL users**
- `@react-pdf/renderer` is 1.46MB uncompressed, 490kB gzipped.
- Currently in its own lazy chunk — good. But it loads on first PDF click, blocking UI for 2-3s on slow connections.
- Fix: Add loading indicator during PDF generation; consider server-side PDF generation via Edge Function.

**D2. CSS bundle is 184kB (27kB gzipped)**  
- Large for a Tailwind app. Indicates many classes are used dynamically (template literals) which defeats Tailwind's purging.
- Fix: Audit dynamic class usage; prefer static class composition.

**D3. address-data.js is 37kB**
- Tanzania's 31-region address data is a large static JSON.
- Fix: Lazy-load address data only when address fields are shown.

**D4. forms chunk is 383kB (97kB gzipped)**
- All 9 forms in one chunk. A citizen applying for burial permit loads the sales agreement form code too.
- Fix: Each form as its own lazy chunk in vite.config.ts manualChunks.

**D5. VerifyDocuments is 185kB**
- Contains QR scanner (jsqr) which is large. Only used on /verify route.
- Already lazy loaded — acceptable.

**D6. No image optimization**
- `public/hero-image.png`, `public/tz-coat-of-arms.png`, `public/new logo.jpeg` not optimized.
- Fix: Convert to WebP, add `loading="lazy"` on non-critical images.

---

## E. UI/UX ISSUES

### Mobile
**E1. Forms overflow on small screens** — some grid-cols-2 on very small phones (320px)
**E2. BottomNav min-height 60px** — may conflict with iOS gesture bar on older iPhones
**E3. PDF download button not mobile-friendly** — small tap target in some views
**E4. Table views on mobile** — Citizen Management table doesn't scroll horizontally on very small screens

### Desktop
**E5. Sidebar always visible** — wastes space on 768-1024px screens (no collapse toggle)
**E6. Dashboard stats cards** — no skeleton for individual stat cards, only page-level
**E7. Empty state illustrations** — most empty states are plain text, no visual aid

### Forms
**E8. Step validation feedback** — errors only shown after "Next" click, not inline as user types
**E9. File upload** — no file type icon differentiation in upload previews
**E10. Long forms on mobile** — BaruaUtambulishoForm (5 steps) loses context of previous answers

---

## F. TECHNICAL DEBT

### F1. Triple app entry point (HIGHEST DEBT)
```
app.tsx → cloned-app-mount.tsx → clone-app.tsx
```
This triple-mount was a migration artifact. Adds complexity and makes debugging harder.
**Fix:** Merge into single `App.tsx` with polyfills inline.

### F2. 44 uses of TypeScript `any`
Bypasses type safety. Concentrated in form data handling and PDF components.
**Fix:** Replace with `Record<string, unknown>` or proper typed interfaces.

### F3. 49 TODOs in codebase
Unresolved technical decisions scattered through code.
**Fix:** Convert TODOs to GitHub Issues; resolve or remove.

### F4. No test coverage on components
Only 3 test files exist (`utils.test.ts`, `export.test.ts`, `smoke.test.ts`).
Critical flows (form submission, payment, PDF generation) have zero tests.
**Fix:** Add Vitest component tests for critical paths.

### F5. No Zod validation on API responses
Supabase responses are typed via TypeScript interfaces but not runtime-validated.
A schema change in DB would cause silent failures.
**Fix:** Add Zod schemas for all Supabase response shapes.

### F6. i18n via inline ternaries
```tsx
{lang === "sw" ? "Jina" : "Name"}
```
This pattern is repeated 800+ times. Adding a 3rd language would require changing every file.
**Fix:** Migrate to centralized `src/lib/i18n.ts` (file already exists, not fully used).

---

## G. PRIORITIZED TASK LIST

### 🔴 P0 — Do Now (Blocking Production)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 1 | Run scalability SQL migration in Supabase | supabase/migrations/20260619_scalability.sql | 5 min |
| 2 | Run storage bucket SQL in Supabase | (already provided) | 5 min |
| 3 | Add CSP headers to vercel.json | vercel.json | 30 min |
| 4 | Fix all `catch (_err) { ... error }` patterns | Multiple files | 1 hr |
| 5 | Add HTTPS redirect | vercel.json | 15 min |
| 6 | Set VITE_SENTRY_DSN in Vercel env vars | Vercel dashboard | 15 min |

### 🟡 P1 — This Week (Quality & Stability)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 7 | Split Profile.tsx (3,557 lines) into sub-components | src/pages/Profile.tsx | 4 hrs |
| 8 | Split forms chunk per-form in vite.config.ts | vite.config.ts | 2 hrs |
| 9 | Replace all TypeScript `any` with proper types | Multiple files | 3 hrs |
| 10 | Merge triple app entry point | app.tsx, clone-app.tsx, cloned-app-mount.tsx | 2 hrs |
| 11 | Add per-form lazy loading | vite.config.ts | 1 hr |
| 12 | Add RLS audit query and fix missing policies | Supabase SQL Editor | 2 hrs |
| 13 | Wire server-side rate limiting into form submissions | AppContext.tsx + Edge Function | 3 hrs |

### 🟢 P2 — This Month (Enhancements)

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 14 | PWA Service Worker for offline support | public/sw.js + vite.config.ts | 4 hrs |
| 15 | Server-side PDF generation (Edge Function) | api/generate-pdf.ts | 6 hrs |
| 16 | Migrate i18n to centralized system | src/lib/i18n.ts | 8 hrs |
| 17 | Add Zod validation on all Supabase responses | src/lib/supabase.ts | 4 hrs |
| 18 | Add component tests for critical paths | src/test/ | 8 hrs |
| 19 | Image optimization (WebP conversion) | public/ | 2 hrs |
| 20 | Lazy-load address-data.js | src/lib/addressData.ts | 1 hr |
| 21 | Add sidebar collapse toggle on 768-1024px | AppShell.tsx, Sidebar.tsx | 2 hrs |
| 22 | Add inline form validation (real-time) | All form components | 4 hrs |
| 23 | Implement real GePG payment integration | src/integrations/payments/ | 16 hrs |
| 24 | Enable NIDA verification API | src/integrations/nida/ | 8 hrs |

---

## H. DEPLOYMENT CHECKLIST

### Environment Variables Required
```
VITE_SUPABASE_URL=https://xuhilnejpqvbfukyhefi.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SENTRY_DSN=https://...@sentry.io/...   ← MISSING
VITE_SITE_URL=https://e-mtaatz.xyz
SUPABASE_SERVICE_ROLE_KEY=...               ← Server-side only (Vercel)
```

### Database Actions Required
- [ ] Run `supabase/migrations/20260619_scalability.sql` (indexes + RPCs)
- [ ] Create `application-documents` storage bucket (SQL provided)
- [ ] Verify RLS on all tables: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'`
- [ ] Set up Supabase Auth custom claim hook for `role` in JWT (enables JWT-based RLS)
- [ ] Configure `pg_cron` for `cleanup_rate_limits()` every 2 hours

### Vercel Actions Required
- [ ] Set all environment variables above
- [ ] Enable Vercel Analytics
- [ ] Set Node.js version to 20.x in project settings
- [ ] Add custom domain SSL (auto via Vercel)
- [ ] Enable Vercel Speed Insights

### Pre-Launch Checklist
- [x] Initial load < 200kB gzipped ✅
- [x] Mobile-first responsive ✅
- [x] Skeleton loading screens ✅
- [x] Error boundary wrapping ✅
- [x] PDF generation working ✅
- [x] Supabase Storage for file uploads ✅
- [x] Realtime staff notifications ✅
- [x] Asset caching (1 year immutable) ✅
- [ ] CSP headers ❌
- [ ] HTTPS redirect ❌
- [ ] Sentry error monitoring ❌
- [ ] NIDA verification ❌
- [ ] GePG payment gateway ❌
- [ ] Service Worker (PWA offline) ❌
- [ ] Load testing at 1000+ concurrent users ❌

---

## I. ARCHITECTURE STRENGTHS (Keep These)

1. **Feature-flagged integrations** — NIDA, TRA, Police, SMS, GePG all mock-safe until real credentials obtained. Excellent pattern.
2. **Server-side admin operations** — Service role key never in browser. Correct security model.
3. **Lazy loading all pages** — Initial bundle 57kB. Excellent.
4. **Skeleton screens throughout** — Professional UX during load.
5. **Bilingual SW/EN** — Well implemented throughout.
6. **Offline drafts** — `offlineDrafts.ts` saves form state to localStorage. Good UX.
7. **Comprehensive PDF system** — 9 service PDFs with QR codes, signatures, government stamps. Production-grade.
8. **Role-based architecture** — Citizen/Staff/Admin/Department portals cleanly separated.
9. **Client-side rate limiting** — Present but needs server-side complement.
10. **Supabase Realtime** — Staff receives instant application notifications.

