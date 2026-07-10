# Current Status — What's Built vs What Remains

> Last updated: June 2026 | Codebase: 142 files, 63,700+ lines of TypeScript/React

---

## ✅ FULLY BUILT AND OPERATIONAL

### Core Platform

| Feature                        | Status      | Details                                                                        |
| ------------------------------ | ----------- | ------------------------------------------------------------------------------ |
| **Citizen signup/login**       | ✅ Complete | Email + password, email confirmation, session management                       |
| **Bilingual interface**        | ✅ Complete | Swahili (default) + English, toggleable at any time                            |
| **Mobile-first responsive UI** | ✅ Complete | Works on phones, tablets, desktops                                             |
| **Profile management**         | ✅ Complete | 60+ fields — personal, demographic, IDs, location, diaspora, emergency contact |
| **Profile photo upload**       | ✅ Complete | Base64 storage, shown on certificates                                          |
| **Role-based access control**  | ✅ Complete | Citizen / Staff / Admin with route protection                                  |

### 9 Government Services (All Forms + PDFs)

| #   | Service                                    | Form                       | PDF Certificate              | Fee        |
| --- | ------------------------------------------ | -------------------------- | ---------------------------- | ---------- |
| 1   | Utambulisho wa Mkazi (Residency)           | ✅ 8-step wizard           | ✅ With photo, QR, signature | 2,000 TZS  |
| 2   | Kibari cha Mazishi (Burial Permit)         | ✅ 6-step wizard           | ✅ With QR, signature        | 5,000 TZS  |
| 3   | Kibari cha Sherehe (Event Permit)          | ✅ Multi-step              | ✅ With event banner, QR     | 10,000 TZS |
| 4   | Kibari cha Ujezi Mdogo (Construction)      | ✅ Multi-step              | ✅ With property details, QR | 15,000 TZS |
| 5   | Barua ya Utambulisho (Introduction Letter) | ✅ 5-step + dept selection | ✅ Letter format, QR         | 3,000+ TZS |
| 6   | Makubaliano ya Mauzo (Sales Agreement)     | ✅ Multi-step              | ✅ 2-party + WEO signatures  | 20,000 TZS |
| 7   | Makubaliano ya Pango (Rental Agreement)    | ✅ 9-step wizard           | ✅ 4-signature grid + WEO    | 15,000 TZS |
| 8   | Mgogoro na Mashauri (Dispute Resolution)   | ✅ Multi-step              | ✅ Dispute/community modes   | 5,000 TZS  |
| 9   | Malipo na Michango (Payments)              | ✅ Multi-step              | ✅ Receipt PDF               | Variable   |

### Electronic Signatures & Stamps

| Feature                      | Status             | Details                                             |
| ---------------------------- | ------------------ | --------------------------------------------------- |
| **Citizen e-signature**      | ✅ All 9 forms     | Canvas-based, touch + mouse, save/clear/redraw      |
| **Staff reusable signature** | ✅ Profile tab     | Draw once, saved to DB, auto-applied on approval    |
| **Official stamp upload**    | ✅ Profile tab     | PNG upload, shown on certificates                   |
| **Signature on PDFs**        | ✅ All 9 templates | Applicant + WEO sections via shared SignatureBlocks |

### Document System

| Feature                           | Status                | Details                                       |
| --------------------------------- | --------------------- | --------------------------------------------- |
| **PDF generation**                | ✅ 9 templates        | Tanzania government letterhead, bilingual     |
| **QR verification codes**         | ✅ All documents      | Unique per document, scannable                |
| **Profile photo on certificates** | ✅ Residency + Letter | Embedded from form_data                       |
| **Document upload (citizen)**     | ✅ All forms          | Selfie, NIDA, proof of residence — base64     |
| **Document review (staff)**       | ✅ Review panel       | Images displayed as thumbnails, PDFs as tiles |
| **Download + Share**              | ✅ Issued status      | Web Share API + clipboard fallback            |

### Payment System

| Feature                | Status      | Details                                                                   |
| ---------------------- | ----------- | ------------------------------------------------------------------------- |
| **Payment gateway UI** | ✅ Complete | M-Pesa, TigoPesa, Airtel Money, NMB, CRDB                                 |
| **Payment flow**       | ✅ Mock     | Realistic UI with phone number entry — **not yet connected to real APIs** |
| **Receipt generation** | ✅ PDF      | With transaction reference and QR                                         |

### Staff & Admin

| Feature                  | Status      | Details                                                         |
| ------------------------ | ----------- | --------------------------------------------------------------- |
| **Staff dashboard**      | ✅ Complete | Stats: pending, paid, approved, rejected                        |
| **Application review**   | ✅ Complete | Full form data, documents, approve/reject/request info/escalate |
| **Citizen management**   | ✅ Complete | Search, filter by status/region/district, verify, confirm email |
| **Staff region scoping** | ✅ Complete | Staff see only citizens in their assigned region                |
| **Admin dashboard**      | ✅ Complete | System-wide stats, recent activity                              |
| **Staff management**     | ✅ Complete | Create staff/admin accounts, assign regions                     |
| **Office management**    | ✅ Complete | CRUD offices, click to see assigned staff                       |
| **Service management**   | ✅ Complete | Configure services, fees, form schemas                          |
| **Location management**  | ✅ Complete | Regions → Districts → Wards hierarchy                           |
| **Activity logging**     | ✅ Complete | Login, submit, approve actions logged                           |

### Government Department System

| Feature                          | Status      | Details                                                             |
| -------------------------------- | ----------- | ------------------------------------------------------------------- |
| **Department management**        | ✅ Complete | 52 pre-populated Tanzania departments                               |
| **Category dropdown**            | ✅ Complete | 36 categories with auto-fill (EN name, SW name, code)               |
| **All TZ regions/districts**     | ✅ Complete | 30 regions, 130+ districts in cascading dropdowns                   |
| **Add staff to departments**     | ✅ Complete | By email, with role (head/officer/clerk)                            |
| **Staff escalation**             | ✅ Complete | Button in review panel → select department → add note               |
| **Citizen department selection** | ✅ Complete | Introduction letter form shows department dropdown for gov purposes |

### Security & Deployment

| Feature                         | Status           | Details                                                                    |
| ------------------------------- | ---------------- | -------------------------------------------------------------------------- |
| **Vercel deployment**           | ✅ Live          | [mtaani-kiganjani-two.vercel.app](https://mtaani-kiganjani-two.vercel.app) |
| **Service key protection**      | ✅ Secure        | Server-side only via `/api/admin` serverless function                      |
| **Row-Level Security**          | ✅ All 20 tables | RLS enabled with role-based policies                                       |
| **Email confirmation redirect** | ✅ Configured    | Returns to deployed domain `/confirm`                                      |
| **Social login buttons hidden** | ✅ Feature flag  | `ENABLE_ALT_AUTH = false` — flip to re-enable                              |

### Code Quality

| Metric            | Value                                    |
| ----------------- | ---------------------------------------- |
| TypeScript errors | **0**                                    |
| ESLint errors     | **0**                                    |
| ESLint warnings   | **2** (intentional mount-fetch patterns) |
| Production build  | **Passes** (~17s, 2618 modules)          |
| Input focus bug   | **Fixed** across all 9 forms             |

---

## 🔲 NOT YET BUILT — Remains for Future Phases

### Phase 2 — Production Hardening (Priority: HIGH)

| Feature                       | Current State | What's Needed                                                      |
| ----------------------------- | ------------- | ------------------------------------------------------------------ |
| **Live payment integration**  | Mock UI only  | M-Pesa/TigoPesa/Airtel API agreements + GePG integration           |
| **NIDA API integration**      | Manual entry  | NIDA API partnership for auto-fill from national ID number         |
| **SMS notifications**         | Email only    | Twilio/Africa's Talking integration for SMS alerts                 |
| **File storage migration**    | Base64 in DB  | Move to Supabase Storage buckets (reduces DB size)                 |
| **Service role key rotation** | ⚠️ PENDING    | Current key was exposed in chat — MUST rotate before public launch |
| **GitHub PAT rotation**       | ⚠️ PENDING    | Same — revoke and regenerate                                       |

### Phase 3 — PWA & Offline (Priority: MEDIUM)

| Feature                   | Current State      | What's Needed                                                       |
| ------------------------- | ------------------ | ------------------------------------------------------------------- |
| **Progressive Web App**   | Standard SPA       | Service Worker, Web App Manifest, offline caching                   |
| **Background sync**       | No offline support | IndexedDB form saves, sync queue, retry on reconnect                |
| **Inter-ward transfer**   | Not built          | Transfer request workflow, release/acceptance, transfer certificate |
| **Sync status indicator** | Not built          | Online/offline/syncing badge in header                              |

### Phase 4 — Analytics & Verification (Priority: MEDIUM)

| Feature                    | Current State                    | What's Needed                                                     |
| -------------------------- | -------------------------------- | ----------------------------------------------------------------- |
| **Analytics dashboards**   | Basic stat cards                 | Processing time metrics, approval rates, staff performance charts |
| **Revenue dashboards**     | Not built                        | Fee collection by ward/service/period, payment method breakdown   |
| **Citizen satisfaction**   | Not built                        | Post-service rating widget, NPS, complaint tracking               |
| **Export to Excel/PDF**    | Not built                        | Report generation with date ranges, auto-scheduling               |
| **Public QR verification** | `/verify` route exists but basic | Full verification portal with tamper detection                    |
| **Verification REST API**  | Not built                        | `GET /api/verify?ref=...` endpoint for third-party systems        |

### Phase 5 — Department Portal (Priority: MEDIUM-LOW)

| Feature                         | Current State         | What's Needed                                         |
| ------------------------------- | --------------------- | ----------------------------------------------------- |
| **Department portal/dashboard** | Admin management only | Per-department login, dashboard, escalation queue     |
| **Court registry**              | Not built             | Case filing, hearing schedules, verdict records       |
| **Auto-routing rules**          | Not built             | Service → department auto-forwarding config           |
| **Inter-department referral**   | Not built             | Department A → Department B forwarding                |
| **Department hierarchy**        | Flat list             | Parent-child relationships (HQ → Regional → District) |

### Phase 6 — National Scale (Priority: LOW)

| Feature                      | Current State     | What's Needed                             |
| ---------------------------- | ----------------- | ----------------------------------------- |
| **Native mobile app**        | Web only          | React Native build sharing business logic |
| **Multi-ward deployment**    | Single instance   | Ward-specific subdomains, central admin   |
| **Inter-system integration** | Standalone        | TRA, BRELA, RITA, Ministry of Lands APIs  |
| **Multi-language**           | Swahili + English | Regional languages                        |
| **National dashboard**       | Not built         | Aggregated cross-ward statistics          |

---

## 🔧 PENDING CONFIGURATION (Not Code — Admin Actions)

These are things the deployer/admin must do, not code changes:

| Action                                    | Where                               | Status                           |
| ----------------------------------------- | ----------------------------------- | -------------------------------- |
| Run `add_signature_stamp_columns.sql`     | Supabase SQL Editor                 | ⚠️ Pending                       |
| Run `add_activity_log_columns.sql`        | Supabase SQL Editor                 | ⚠️ Pending                       |
| Run `add_government_departments.sql`      | Supabase SQL Editor                 | ⚠️ Pending                       |
| Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel | Vercel Env Vars                     | ⚠️ Pending (use NEW rotated key) |
| Set Supabase Site URL                     | Auth → URL Configuration            | ⚠️ Verify                        |
| Set Supabase Redirect URLs                | Auth → URL Configuration            | ⚠️ Verify                        |
| Rotate service role key                   | Supabase → Settings → API           | ⚠️ CRITICAL                      |
| Rotate GitHub PAT                         | GitHub → Developer settings         | ⚠️ CRITICAL                      |
| Create first admin account                | DB → users table → set role='admin' | Once                             |
| Configure Google OAuth                    | Supabase Auth providers             | When ready                       |
| Configure Apple Sign-In                   | Supabase Auth providers             | When ready                       |
| Configure SMS provider                    | Supabase Auth → Phone               | When ready                       |

---

## Database Summary

**20 tables** across 4 migrations:

| Migration                         | Tables                                               | Status      |
| --------------------------------- | ---------------------------------------------------- | ----------- |
| `e_serikali_schema.sql`           | 16 core tables (users, applications, payments, etc.) | ✅ Deployed |
| `add_signature_stamp_columns.sql` | Adds signature_url, stamp_url to users               | ⚠️ Run this |
| `add_activity_log_columns.sql`    | Adds action_type, severity, status to activity_logs  | ⚠️ Run this |
| `add_government_departments.sql`  | 4 new tables + 52 department seed data               | ⚠️ Run this |

---

## Route Map (25 routes)

| Path                  | Role        | Page                                   |
| --------------------- | ----------- | -------------------------------------- |
| `/`                   | Public      | Landing page                           |
| `/verify`             | Public      | Document verification                  |
| `/confirm`            | Public      | Email confirmation handler             |
| `/app`                | Citizen     | Main app shell                         |
| `/dashboard`          | Citizen     | Personal dashboard                     |
| `/services`           | Citizen     | Service catalog                        |
| `/apply`              | Citizen     | Service application form               |
| `/applications`       | Citizen     | My applications + download             |
| `/agreement`          | Citizen     | Agreement signing flow                 |
| `/profile`            | All         | Profile management + signature (staff) |
| `/notifications`      | All         | Notification center                    |
| `/verify-docs`        | Staff       | Document verification tools            |
| `/staff`              | Staff       | Staff dashboard                        |
| `/staff/review`       | Staff       | Application review panel               |
| `/staff/support`      | Staff       | Customer support                       |
| `/staff/verification` | Staff       | Manual verification                    |
| `/staff/business`     | Staff       | Business approvals                     |
| `/citizens`           | Staff/Admin | Citizen database                       |
| `/admin`              | Admin       | Admin dashboard                        |
| `/admin/staff`        | Admin       | Staff management                       |
| `/admin/offices`      | Admin       | Office management                      |
| `/admin/locations`    | Admin       | Location management                    |
| `/admin/services`     | Admin       | Service configuration                  |
| `/admin/departments`  | Admin       | Government departments                 |
| `/admin/logs`         | Admin       | Activity logs                          |
