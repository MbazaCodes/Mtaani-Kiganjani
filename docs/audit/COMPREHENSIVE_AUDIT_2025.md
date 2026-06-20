# Mtaani-Kiganjani (E-MTAA) — Comprehensive Engineering Audit Report
**Date:** June 2025  
**Auditor:** Senior Full-Stack / Security / UX Engineer  
**Repos analysed:** `MbazaCodes/Mtaani-Kiganjani` (original) + workspace Next.js migration  
**Stack audited:** React 19 + Vite 7 + Supabase (original) → Next.js 16 + Prisma/SQLite (migration)

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [A — Repository Analysis](#a-repository-analysis)
3. [B — Security Review](#b-security-review)
4. [C — UI/UX Improvements](#c-uiux-improvements)
5. [D — Performance Optimization](#d-performance-optimization)
6. [E — New Features Roadmap](#e-new-features-roadmap)
7. [F — Code Quality](#f-code-quality)
8. [G — Prioritized Task List](#g-prioritized-task-list)
9. [H — Deployment Checklist](#h-deployment-checklist)

---

## 1. Executive Summary

E-MTAA is a Tanzanian local-government e-services portal enabling citizens to apply for identification documents, certificates, permits, land services and more. The project has been under active development and has reached a **functional-but-fragile** state:

| Dimension | Score | Notes |
|---|---|---|
| Architecture | 4/10 | 921-line monolithic router, 3,557-line Profile page |
| Security | 5/10 | X-User-Id bypass, no rate limiting, token in URL risk |
| Performance | 4/10 | No React Query, 66 deps, @sentry/react loaded but never called |
| Code Quality | 5/10 | 3 validation strategies, 2 i18n systems, 2 toast libraries |
| UI/UX | 7/10 | Good visual design; mobile UX weakened by missing loading states |
| Test Coverage | 1/10 | vitest config exists but near-zero test files |

The workspace Next.js migration is significantly **better-architected** (Zustand stores, Prisma schema, typed APIs, React Query patterns) but has its own issues listed below.

---

## A. Repository Analysis

### A1. Original Repo (`MbazaCodes/Mtaani-Kiganjani`)

```
src/
├── clone-app.tsx          # 921 lines — monolithic router + inline ForcePasswordChange
├── pages/ (25+ files)
│   ├── Profile.tsx        # 3,557 lines — CRITICAL decomposition needed
│   ├── Agreement.tsx      # 2,818 lines
│   ├── ApplicationReview.tsx # 1,919 lines
│   └── ...
├── components/
│   ├── documents/ (11 PDF components — all non-lazy)
│   ├── forms/ (9 forms — only 2 use FormShell primitive)
│   └── ui/ (56 shadcn components — ~30 unused)
├── context/
│   ├── AppContext.tsx      # 405 lines — god-context
│   └── AuthContext.tsx     # Custom Supabase auth
├── integrations/ (6 files — ALL mock/stub, no live integration)
├── lib/ (20+ utilities)
│   ├── i18n.ts + LanguageContext → 2 i18n systems
│   └── formatCurrency() defined in 2 places
└── constants/
    └── services.ts        # Hardcoded services data (should be DB-driven)
```

### A2. Migration Workspace (Next.js 16)

```
src/
├── app/
│   ├── page.tsx           # Single-page router (good)
│   └── api/               # 15 REST endpoints
├── components/
│   ├── views/ (14 views)  # Well decomposed
│   ├── shared/ (5 shared components)
│   └── layout/ (4 layout components)
├── stores/ (3 Zustand stores)
├── lib/ (5 utilities — clean)
├── schemas/ (1 Zod schema file — comprehensive)
└── types/ (1 types file — comprehensive)
```

### A3. Tech Stack

| Layer | Original | Migration | Recommendation |
|---|---|---|---|
| Framework | React 19 + Vite | Next.js 16 | ✅ Keep Next.js |
| Auth | Supabase Auth | Custom Bearer token | ⚠️ Add expiry + refresh |
| DB | Supabase (Postgres) | Prisma + SQLite | ⚠️ Switch to Postgres for prod |
| State | Context (god) | Zustand stores | ✅ Good |
| Forms | Mixed (3 strategies) | react-hook-form + Zod | ✅ Keep |
| i18n | 2 systems | 1 system (i18n.ts) | ✅ Keep migration approach |
| Payments | Mock/stub | Not implemented | 🔴 Needs GePG integration |
| SMS | Mock/stub | Not implemented | 🔴 Needs Beem/AfricasTalking |
| PDF | @react-pdf/renderer | Not in migration | 🔴 Must port |

### A4. Missing Features (vs original)

| Feature | Original | Migration | Priority |
|---|---|---|---|
| PDF document generation | ✅ 11 templates | ❌ Missing | HIGH |
| NIDA verification UI | ✅ Stub UI | ❌ Missing | HIGH |
| Staff Manual Verification | ✅ Full flow | ❌ Partial | HIGH |
| Agreement/contracts | ✅ 2,818-line page | ❌ Missing | MEDIUM |
| Community reporting | ✅ Present | ❌ Missing | MEDIUM |
| Communications center | ✅ Present | ❌ Missing | LOW |
| Payments page (MyPayments) | ✅ Present | ❌ Missing | HIGH |
| Business approval flow | ✅ Present | ❌ Missing | MEDIUM |
| QR code verification | ✅ jsqr + qrcode | ❌ Missing | MEDIUM |
| PWA / offline support | ❌ Partial | ❌ Missing | MEDIUM |

### A5. Technical Debt Summary

| Issue | Severity | Impact |
|---|---|---|
| Profile.tsx = 3,557 lines | 🔴 Critical | Unmaintainable, causes slow CI |
| clone-app.tsx = 921-line router | 🔴 Critical | Cannot scale, impossible to test |
| 2 i18n systems (i18n.ts + LanguageContext) | 🟡 High | Translation drift, translation duplication |
| 2 toast libraries (react-toastify + sonner) | 🟡 High | ~50KB dead weight |
| @sentry/react installed, never called | 🟡 High | ~150KB dead bundle weight |
| @capacitor/cli in dependencies (not devDeps) | 🟠 Medium | Runtime bloat |
| Hardcoded services in `constants/services.ts` | 🟡 High | Can't edit via admin UI |
| 0 unit/integration tests | 🔴 Critical | No regression safety net |
| `typescript.ignoreBuildErrors: true` in next.config | 🟡 High | Masks real TS errors |
| reactStrictMode: false | 🟠 Medium | Hides double-render bugs |
| SQLite in production (migration) | 🟡 High | No concurrent write safety |

---

## B. Security Review

### B1. Authentication Weaknesses

#### 🔴 CRITICAL: X-User-Id header bypass
```typescript
// src/lib/auth.ts — ORIGINAL migration code
const userId = request.headers.get("X-User-Id");
if (userId) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (user && user.accountStatus === "ACTIVE") {
    return { user: stripSensitiveFields(user), error: null };
  }
}
```
**Impact:** Any caller who knows (or guesses) a valid `userId` can impersonate that user without a password. CUID IDs are not secret — they appear in API responses.

**Fix:** Remove the `X-User-Id` fallback entirely. Require Bearer tokens for all authenticated requests.

#### 🟡 HIGH: Tokens never expire
Tokens are random UUIDs stored in the DB. The login sets a 30-day `expiresAt` in the response, but **the API never checks it**. A stolen token is valid forever until the user explicitly logs out.

**Fix:**
```typescript
// Add expiresAt to User model
token        String?   @unique
tokenExpiresAt DateTime? @map("token_expires_at")

// Check in authenticateRequest:
if (user.tokenExpiresAt && user.tokenExpiresAt < new Date()) {
  // Token expired — return 401
}
```

#### 🟡 HIGH: No rate limiting on login/register
`/api/auth/login` and `/api/auth/register` are unprotected. An attacker can brute-force passwords or flood the registration endpoint.

**Fix:** Add per-IP rate limiting using `next-rate-limit` or a Vercel Edge middleware.

#### 🟠 MEDIUM: Token stored in Zustand persist (localStorage)
```typescript
// auth-store.ts
persist(
  (set) => ({ ... }),
  { name: "emtaa-auth", partialize: (state) => ({ user: state.user, isAuthenticated: ... }) }
)
```
The persisted user object does **not** include the token, which is good. However, the token is set by the login API response and likely stored in the component state, not in httpOnly cookies, making it vulnerable to XSS.

**Fix:** Move token to httpOnly cookie via a `/api/auth/session` Set-Cookie endpoint.

### B2. API Vulnerabilities

#### 🟡 HIGH: Staff role can access unassigned applications
```typescript
// applications/route.ts
if (auth.user.role === "STAFF") {
  where.OR = [
    { assignedStaffId: auth.user.id },
    ...(status || serviceId ? [{ assignedStaffId: null }] : []),
  ];
}
```
Staff can see **all unassigned applications** when filtering by status or serviceId. This leaks citizen data across departments.

**Fix:** Add `departmentId` filtering — staff should only see applications for their office/department.

#### 🟠 MEDIUM: Admin stats endpoint has no role check
```typescript
// /api/admin/stats/route.ts — verify this has requireRole("ADMIN")
```
Check all admin endpoints enforce `requireRole(user, ["ADMIN"])`.

#### 🟠 MEDIUM: Input sanitisation — JSON fields stored raw
`formData` and `formFields` are stored as JSON strings. There is no sanitisation of HTML/script content. If any field is rendered as `dangerouslySetInnerHTML`, it's an XSS vector.

**Fix:** Sanitise all free-text form fields with DOMPurify before storage, or ensure all rendering uses React's escaped rendering.

### B3. Secrets Exposure

| Finding | Severity | Location |
|---|---|---|
| No hardcoded secrets found in source | ✅ Safe | integrations/config.ts uses env vars |
| `VITE_` env vars exposed to browser bundle | 🟠 Med | Expected for Vite; API keys must be server-side |
| SQLite DB file path in env — verify not committed | 🟡 High | Check .gitignore |

**Action:** Confirm `*.db`, `*.db-journal`, `.env`, `.env.local` are in `.gitignore`.

### B4. Input Validation

| Form | Zod Schema | Server Validation | Score |
|---|---|---|---|
| Login | ✅ loginSchema | ✅ safeParse | ✅ |
| Register | ✅ createUserSchema | ✅ safeParse | ✅ |
| Application submit | ✅ submitApplicationSchema | ✅ safeParse | ✅ |
| Profile update | ⚠️ Partial | ⚠️ Partial | 🟠 |
| Service create (admin) | ✅ createServiceSchema | ✅ safeParse | ✅ |

**Missing:** File upload validation (type, size, content-type spoofing). The Document model stores `fileUrl` but there's no server-side file type verification.

### B5. Recommended Security Fixes (Priority Order)

1. **Remove X-User-Id bypass** (1 hour, CRITICAL)
2. **Add token expiry check in auth middleware** (2 hours, HIGH)
3. **Add rate limiting on auth routes** (3 hours, HIGH)
4. **Switch to httpOnly cookies for token storage** (4 hours, HIGH)
5. **Staff department isolation in application queries** (2 hours, HIGH)
6. **Verify .gitignore covers DB files + .env** (30 min, HIGH)
7. **Add CSP headers in next.config.ts** (1 hour, MEDIUM)
8. **File upload type verification** (3 hours, MEDIUM)

---

## C. UI/UX Improvements

### C1. Current State Assessment

**Strengths:**
- Bilingual EN/SW is well-implemented
- Consistent shadcn/ui component system
- Tanzania Coat of Arms branding is correct and professional
- StatusBadge and StatCard shared components are reusable

**Weaknesses:**

| Issue | Severity | Screen |
|---|---|---|
| No skeleton loaders on initial data fetch | 🟡 High | Dashboard, Applications |
| Empty state on Applications is generic | 🟠 Med | Applications list |
| No progress indicator on multi-step apply form | 🟡 High | ApplyView |
| Staff queue has no assignment feedback | 🟡 High | StaffQueueView |
| No pagination UI on ApplicationsView | 🟠 Med | ApplicationsView |
| Admin dashboard charts missing (recharts imported but unused) | 🟡 High | AdminDashboardView |
| No offline indicator / PWA shell | 🟠 Med | All views |
| Dark mode gap in bottom nav (hardcoded colors) | 🟠 Med | BottomNav |
| LandingView hero image not responsive on 320px screens | 🟠 Med | LandingView |

### C2. Navigation Improvements

**Current:** Sidebar (desktop) + BottomNav (mobile) — architecture is correct.

**Issues:**
- BottomNav shows 5 items on mobile — 4 max recommended for thumb reach
- Sidebar active state uses `bg-primary text-white` — should use sidebar CSS vars
- No breadcrumb on detail views (ApplicationDetailView)

### C3. Form UX

**ApplyView (705 lines) issues:**
- Dynamic form fields from `service.formFields` JSON — no step grouping for long forms
- No field-level error summary at top of form (accessibility)
- File upload has no drag-and-drop on mobile

**Recommended improvements:**
- Add `<FormProgress>` component showing step n of N
- Show field errors summary in `<Alert>` on submit failure
- Add `<Dropzone>` component for document uploads

### C4. Dashboard Experience

**CitizenDashboard missing:**
- Application status timeline (reuse `StatusTimeline` from original)
- Payment summary card
- Verification tier progress indicator (citizen should see "Complete NIDA to unlock full services")
- Recent document downloads

### C5. Mobile Optimization

| Issue | Fix | Priority |
|---|---|---|
| Touch targets < 44px on StatCard | Increase min-height to `h-20` | HIGH |
| Horizontal scroll in ServiceCategory grid | Use `grid-cols-2` on mobile, `grid-cols-4` on desktop | HIGH |
| ApplyView form inputs overflow on 320px | Add `max-w-full overflow-hidden` | MEDIUM |
| PDF viewer not mobile-friendly | Add pinch-to-zoom or open in new tab | MEDIUM |

---

## D. Performance Optimization

### D1. Bundle Size

**Original repo (Vite):**
| Dependency | Size | Action |
|---|---|---|
| @sentry/react | ~150KB | Remove or actually initialize |
| @react-pdf/renderer | ~450KB | Lazy load PDF routes only |
| framer-motion | ~125KB | Lazy load or use CSS transitions |
| @capacitor/* (5 packages) | ~80KB | Move to devDependencies |
| react-toastify | ~25KB | Remove — sonner already used |
| qrcode + qrcode.react | ~50KB | Lazy load on QR pages only |
| jsqr | ~60KB | Lazy load scanner only |

**Estimated savings: ~600KB+ gzipped by removing/lazy-loading above**

**Migration workspace (Next.js):**
- `@mdxeditor/editor` (~500KB) installed but I see no MDX editing UI — verify usage or remove
- `z-ai-web-dev-sdk` is present — if not needed for production, remove

### D2. Database / API

**Current issues:**

| Issue | Fix |
|---|---|
| Applications query does `findMany` + `count` with no index on `createdAt` | Add `@@index([createdAt])` to Application |
| Staff queue loads all applications with includes (citizen+service+staff) | Add cursor-based pagination |
| Notification read-all does single `updateMany` — good | ✅ Keep |
| No DB connection pooling (SQLite single-writer) | Switch to Postgres + PgBouncer for production |
| `formData` and `formFields` stored as JSON strings — parsed on every request | Store as `Json` type once on Postgres |

### D3. Frontend Performance

**Recommended changes:**
1. **React Query** — replace `useEffect+useState` data fetching in all views with `useQuery` (already a dep in migration workspace)
2. **Suspense boundaries** — wrap views with `<Suspense fallback={<SkeletonCard />}>` for automatic loading states
3. **Image optimization** — `next/image` for `/tz-coat-of-arms.png` and `/logo.jpeg`
4. **API response caching** — add `Cache-Control: s-maxage=60` headers on read-only endpoints (services list, offices list)

### D4. Lighthouse Targets

| Metric | Current Estimate | Target |
|---|---|---|
| Performance | ~60 | 85+ |
| Accessibility | ~72 | 95+ |
| Best Practices | ~75 | 95+ |
| SEO | ~80 | 95+ |
| PWA | 0 | 70+ |

---

## E. New Features Roadmap

### E1. Citizen Service Request Tracking (Sprint 1)
- Real-time application status timeline with timestamps
- SMS/email notifications on status change
- Estimated completion date display
- Document collection checklist per application

### E2. Notifications System (Sprint 1) — Partially implemented
- ✅ Notification model exists
- ✅ Notification created on application submit
- ❌ No real-time push (WebSocket or polling)
- ❌ No SMS notifications
- ❌ No email notifications

**Implementation plan:**
```
1. Add polling in NotificationsView (every 30s via React Query refetchInterval)
2. Add Beem Africa SMS integration for status updates
3. Add email via Resend/SendGrid for critical updates
```

### E3. Document Management
- Citizen document vault (upload once, reuse in applications)
- Server-side PDF generation for all 11 document types (port from original)
- QR code on all issued documents for verification

### E4. Analytics Dashboard (Admin)
- Applications by status over time (recharts LineChart)
- Applications by service category (recharts PieChart)
- Processing time averages by service
- Staff performance metrics
- Regional application heat map

### E5. PWA / Offline Support
- `next-pwa` with Workbox
- Offline cache: services list, user profile, draft applications
- IndexedDB for draft form state
- Sync queue for offline submissions

### E6. Real-time Updates
- Server-Sent Events (SSE) for application status changes
- `/api/events/[userId]` SSE endpoint
- Client-side `EventSource` hook in NotificationStore

### E7. GePG Payment Integration
- Government e-Payment Gateway control number generation
- Mobile money: M-Pesa, Tigo Pesa, Airtel Money
- Payment receipt PDF generation
- Reconciliation webhook handler

---

## F. Code Quality

### F1. Files to Refactor

| File | Lines | Action |
|---|---|---|
| `src/clone-app.tsx` | 921 | Decompose into `routes/index.tsx` + `components/auth/ForcePasswordChange.tsx` |
| `src/pages/Profile.tsx` | 3,557 | Split into 8+ focused components |
| `src/pages/Agreement.tsx` | 2,818 | Split into form + preview + submit components |
| `src/context/AppContext.tsx` | 405 | Replace with Zustand stores (match migration pattern) |
| `src/constants/services.ts` | 600+ | Move to DB, keep as seed data only |

### F2. Naming Conventions

**Issues found:**
- Mix of PascalCase components and kebab-case files
- `clone-app.tsx` / `cloned-app-mount.tsx` — non-descriptive legacy names
- Supabase table columns use `snake_case`, TypeScript interfaces use `camelCase` — correct but requires mapping

**Standard to adopt:**
```
Components: PascalCase (ProfileEditForm.tsx)
Hooks: use-kebab-case.ts
Utilities: camelCase functions in kebab-case files (lib/format-utils.ts)
API routes: Next.js convention (app/api/resource/route.ts)
Constants: SCREAMING_SNAKE_CASE
Types/Interfaces: PascalCase
```

### F3. TypeScript Strictness

**Migration workspace has:**
```json
// next.config.ts
typescript: { ignoreBuildErrors: true }
```
**This must be removed before production.** Fix the underlying TS errors instead.

**Original repo:** `strict: true` in tsconfig but many `as unknown as X` casts suggesting the types are not fully accurate.

### F4. Test Strategy

**Current:** ~0% coverage.

**Recommended priority tests:**
1. Unit: `authenticateRequest` — all code paths (valid token, expired, X-User-Id removed)
2. Unit: Zod schemas — edge cases (Tanzanian phone, NIDA format)
3. Integration: `POST /api/auth/login` — valid/invalid credentials
4. Integration: `POST /api/applications` — citizen submit, staff permissions
5. E2E: Citizen full flow (register → apply → track)
6. E2E: Staff review flow (assign → approve/reject)

---

## G. Prioritized Task List

### 🔴 P0 — Critical (Do first, blocks production)

| # | Task | Est. Hours | File(s) |
|---|---|---|---|
| G1 | Remove X-User-Id auth bypass | 1h | `src/lib/auth.ts` |
| G2 | Add token expiry check | 2h | `src/lib/auth.ts`, `prisma/schema.prisma` |
| G3 | Fix `typescript.ignoreBuildErrors: true` | 2h | `next.config.ts` |
| G4 | Switch SQLite → PostgreSQL | 3h | `prisma/schema.prisma`, env vars |
| G5 | Add rate limiting on auth routes | 3h | `src/app/api/auth/*/route.ts` |
| G6 | Verify .gitignore coverage | 30m | `.gitignore` |

### 🟡 P1 — High (Sprint 1, 1-2 weeks)

| # | Task | Est. Hours | File(s) |
|---|---|---|---|
| G7 | Port PDF document generation (11 templates) | 16h | `src/components/documents/` |
| G8 | Add React Query to all data-fetching views | 8h | All views |
| G9 | Implement real-time notification polling | 4h | `src/stores/notification-store.ts` |
| G10 | Port MyPayments view | 6h | New view |
| G11 | Port Agreement/contracts flow | 8h | New view |
| G12 | Staff department isolation (security) | 2h | `src/app/api/applications/route.ts` |
| G13 | Add pagination UI to ApplicationsView | 3h | `src/components/views/applications-view.tsx` |
| G14 | Add recharts analytics to AdminDashboard | 4h | `src/components/views/admin-dashboard-view.tsx` |

### 🟠 P2 — Medium (Sprint 2, 2-3 weeks)

| # | Task | Est. Hours | File(s) |
|---|---|---|---|
| G15 | Add breadcrumbs to detail views | 2h | `src/components/layout/` |
| G16 | ApplyView: multi-step form with progress | 6h | `src/components/views/apply-view.tsx` |
| G17 | Beem SMS integration for status notifications | 8h | New integration |
| G18 | QR code generation on issued documents | 4h | `src/components/documents/` |
| G19 | PWA: add manifest + service worker | 4h | `public/manifest.json`, `next-pwa` |
| G20 | Write P0 unit tests (auth + schemas) | 6h | `src/__tests__/` |
| G21 | Profile.tsx decomposition (original) | 12h | `src/pages/Profile.tsx` |
| G22 | Accessibility audit: ARIA labels, focus traps | 4h | All views |

### 🔵 P3 — Low (Sprint 3+)

| # | Task | Est. Hours |
|---|---|---|
| G23 | GePG payment gateway integration | 20h |
| G24 | Full E2E test suite (Playwright) | 16h |
| G25 | Community reporting view | 8h |
| G26 | Communications center | 6h |
| G27 | Offline IndexedDB form drafts | 10h |
| G28 | Server-Sent Events for real-time status | 8h |
| G29 | Analytics heat map (regional applications) | 6h |

---

## H. Deployment Checklist

### Pre-Deployment

- [ ] `typescript.ignoreBuildErrors: false` — fix all TS errors
- [ ] `reactStrictMode: true` — re-enable
- [ ] All `console.log` debug statements removed
- [ ] `.env.example` created with all required vars documented
- [ ] `.env`, `*.db` in `.gitignore` and confirmed not in git history
- [ ] Database migrated to PostgreSQL (not SQLite)
- [ ] `prisma migrate deploy` run against production DB
- [ ] Seed data loaded: services, offices, admin user
- [ ] Rate limiting configured on auth endpoints
- [ ] X-User-Id bypass removed
- [ ] Token expiry implemented

### Environment Variables (Required)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/emtaa

# Auth
NEXTAUTH_SECRET=<32-char-random>
NEXTAUTH_URL=https://e-mtaatz.xyz

# Optional integrations
VITE_ENABLE_NIDA=false
VITE_NIDA_API_URL=
VITE_ENABLE_PAYMENTS=false
VITE_PAYMENT_PROVIDER=gepg
VITE_ENABLE_SMS=false
VITE_SMS_PROVIDER=beem
BEEM_API_KEY=
BEEM_SECRET_KEY=
```

### Post-Deployment

- [ ] Smoke test: citizen register → login → apply → track
- [ ] Smoke test: admin login → view stats → manage users
- [ ] Smoke test: staff login → process application → approve
- [ ] Check Vercel Functions logs for errors
- [ ] Confirm PDF generation works on server (sharp + canvas dependencies)
- [ ] Test dark mode on mobile Chrome
- [ ] Test RTL/Swahili language toggle
- [ ] Verify notification polling works
- [ ] Load test: 100 concurrent users on ApplicationsView

---

## Appendix: Files to Modify (Exact List)

### Critical Security Fixes

**`src/lib/auth.ts`** — Remove X-User-Id block, add token expiry check  
**`prisma/schema.prisma`** — Add `tokenExpiresAt DateTime?` to User model  
**`next.config.ts`** — Remove `ignoreBuildErrors: true`, add CSP headers  
**`src/app/api/auth/login/route.ts`** — Set tokenExpiresAt on login  
**`src/app/api/auth/register/route.ts`** — Set tokenExpiresAt on register  
**`src/app/api/applications/route.ts`** — Add department isolation for STAFF  

### Performance

**All view files** — Replace `useEffect+useState` with `useQuery` from @tanstack/react-query  
**`src/app/layout.tsx`** — Add QueryClientProvider  
**`next.config.ts`** — Add image domains for optimization  

### UI/UX

**`src/components/views/apply-view.tsx`** — Add FormProgress component  
**`src/components/views/applications-view.tsx`** — Add pagination controls  
**`src/components/views/admin-dashboard-view.tsx`** — Add recharts charts  
**`src/components/layout/bottom-nav.tsx`** — Fix dark mode, reduce to 4 items  

### Code Quality

**`src/clone-app.tsx`** — Decompose into router + components (original repo)  
**`src/pages/Profile.tsx`** — Decompose into 8 focused components (original repo)  
**`src/context/AppContext.tsx`** — Extract into Zustand stores (original repo)  

---

*Report generated by Senior Engineering Audit — E-MTAA / Mtaani-Kiganjani*  
*Next review recommended: after P0 items are resolved*
