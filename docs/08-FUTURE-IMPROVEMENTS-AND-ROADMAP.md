# Future Improvements & Roadmap

## Phase 2 — Production Hardening (Next 3 Months)

### Payment Integration
- **Mobile Money API integration**: Live M-Pesa (Vodacom), TigoPesa (Tigo), and Airtel Money via their merchant APIs
- **GePG integration**: Tanzania's Government Electronic Payment Gateway for official fee collection
- **Payment reconciliation**: Automated matching of mobile money transactions to applications
- **Receipt generation**: Official TRA-compliant payment receipts

### NIDA Integration
- **Live NIDA API**: Query the National Identification Authority database to auto-fill citizen profiles from their NIDA number
- **Biometric verification**: Fingerprint or face match against NIDA records (requires NIDA API partnership)
- **Real-time verification badges**: Green checkmark for NIDA-verified citizens

### File Storage Migration
- **Supabase Storage buckets**: Move document uploads from base64-in-database to dedicated object storage
- **Benefits**: Reduced database size, faster queries, direct image URLs, CDN caching
- **Image compression**: Auto-resize uploaded photos to reduce storage costs

### SMS Notifications
- **Twilio / Africa's Talking integration**: SMS alerts for application status changes
- **Critical for Tanzania**: Many citizens lack reliable email but have active mobile numbers
- **Templates**: "Maombi yako #TZ-MKZ-20260604 yameidhinishwa. Pakua cheti kwenye mtaani.go.tz"

---

## Phase 3 — Progressive Web App & Offline Support (3–6 Months)

### Progressive Web App (PWA)
- **Install on homescreen**: Citizens tap "Add to Home Screen" on Android/iOS — the app launches like a native application with a splash screen and the Mtaani Kiganjani icon, no app store needed
- **Service Worker**: Caches the application shell (HTML, CSS, JS, icons) so the app opens instantly even without internet
- **Offline pages**: Dashboard, profile, and form pages load from cache when offline — critical for rural Tanzania where connectivity is intermittent
- **Push notifications**: Real-time alerts for application status changes without SMS costs (requires HTTPS + service worker)
- **Web App Manifest**: Defines app name ("Mtaani Kiganjani"), theme color (emerald), orientation, and display mode (standalone)

### Background Sync for Forms
- **Auto-save on every field change**: Form progress saved to IndexedDB/localStorage after each input — citizens never lose work if the browser crashes or they accidentally close the tab
- **Offline queue**: When a citizen submits a form without internet, it enters a local queue with a "Pending Sync" badge
- **Automatic retry**: When connectivity returns, the Service Worker detects the network change and submits all queued applications in order
- **Conflict resolution**: If the same form is submitted from two devices, the server keeps the newest submission and notifies the citizen
- **Sync status indicator**: A small icon in the header shows: ● Green (online, synced) / ● Amber (online, syncing) / ● Red (offline, queued)

### Inter-Ward Transfer Workflow
- **Citizen relocation**: When a citizen moves from one ward to another, they initiate a transfer request from their profile
- **Current ward release**: The citizen's current ward officer reviews and approves the release, confirming the citizen's record is clean
- **New ward acceptance**: The destination ward officer receives the transfer request and accepts the citizen into their jurisdiction
- **Record migration**: All historical applications, documents, and verification status transfer with the citizen — no re-verification needed
- **Transfer certificate**: An official "Certificate of Transfer" PDF is generated with QR verification, signed by both ward officers
- **Timeline tracking**: Full audit trail: Requested → Released → Accepted → Completed

---

## Phase 4 — Analytics, Reporting & Document Verification (6–9 Months)

### Service Delivery Analytics Dashboard
- **Processing time metrics**: Average time from submission to approval per service type, per ward, per month — identifies bottlenecks (e.g., "Burial permits take 4.2 days average in Ilala but 1.1 days in Kinondoni")
- **Approval rate tracking**: Percentage of applications approved vs. rejected vs. returned, broken down by service and officer — surfaces training needs
- **Staff performance**: Applications processed per officer, average review time, citizen satisfaction scores
- **Trend analysis**: Month-over-month growth in registrations, service usage, and revenue with interactive charts (Recharts)
- **Peak hours heatmap**: When citizens submit applications — helps with staffing decisions

### Revenue & Financial Dashboards
- **Fee collection by ward**: Total revenue per ward office, filterable by date range
- **Service type breakdown**: Which services generate the most revenue (pie chart + table)
- **Payment method distribution**: M-Pesa vs. TigoPesa vs. Airtel vs. Bank — informs payment provider negotiations
- **Outstanding fees**: Applications approved but not yet paid — follow-up action queue
- **Monthly/quarterly/annual summaries**: Auto-generated financial reports for government oversight
- **Budget vs. actual**: Compare expected fee collection against actual collected amounts

### Citizen Satisfaction & Feedback
- **Post-service rating**: After downloading a certificate, citizens rate the experience (1–5 stars) with optional comment
- **NPS (Net Promoter Score)**: "Would you recommend this service to others?" — tracked over time
- **Complaint tracking**: Citizens can flag issues directly from their application detail page
- **Feedback dashboard**: Admin sees aggregated ratings per service, per ward, with trend lines
- **Automated follow-up**: Low-rated experiences trigger a notification to the ward supervisor

### Export to Excel/PDF Reports
- **One-click Excel export**: Any dashboard table exportable to `.xlsx` with formatted headers, filters, and totals
- **PDF report generation**: Formal government reports with letterhead, charts, tables, and signatures — ready for printing
- **Scheduled reports**: Admin configures weekly/monthly auto-generated reports delivered via email
- **Custom date ranges**: All reports filterable by start date, end date, region, district, service type
- **Government format compliance**: Reports formatted per Tanzania public sector reporting standards

### Document Verification Portal (Public)
- **Public QR scanner page**: A standalone page at `/verify` accessible without login — any institution (bank, employer, school, police) can scan or enter a certificate's QR code to verify authenticity
- **Verification display**: Shows document type, holder name, issue date, issuing officer, and ward — with a clear "AUTHENTIC ✓" or "NOT FOUND ✗" result
- **Verification API (REST)**: `GET /api/verify?ref=TZ-MKZ-20260604-5380` returns JSON with document status — allows automated verification by third-party systems (banks, employers, courts)
- **Rate limiting**: Prevent abuse with IP-based rate limiting (100 verifications/hour per IP)
- **Tamper detection**: Each document's content (applicant name, dates, service type) is hashed at generation time; the verification endpoint re-computes the hash and compares — any tampering (altered PDF) is detected and flagged
- **Verification log**: Every verification attempt is logged (who verified, when, from where) for audit purposes
- **Offline verification**: The QR code encodes enough data (name, reference, hash) for basic verification even without internet — the scanner app checks the hash locally

---

## Phase 5 — Government Department Integration (9–15 Months)

### Government Department Portal

A major platform expansion that connects ward-level services to **national government departments** (Police, Health, Legal/Courts, Education, Social Welfare, Immigration, etc.), enabling cross-departmental workflows, escalation, and inter-agency communication.

#### Department Management (Admin)

| Feature | Description |
|---------|-------------|
| **Create departments** | Admin defines government departments (e.g., Tanzania Police Force, Ministry of Health, Judiciary, RITA, Immigration) with name, code, level (national/regional/district), and contact details |
| **Department roles & permissions** | Each department gets its own role type with configurable capabilities — what they can view, what actions they can take, what data they access |
| **Department staff creation** | Like creating ward staff, but scoped to a department — admin creates department users with department-specific dashboards |
| **Department hierarchy** | National HQ → Regional offices → District offices — mirrors Tanzania's government structure |
| **Service routing rules** | Admin configures which services automatically route copies to which departments (e.g., "All dispute resolutions → Legal Department", "All burial permits → Health Department") |

#### Department Portal (Per-Department Dashboard)

Each department gets its own portal with a tailored interface:

```
┌──────────────────────────────────────────────────────┐
│  POLICE DEPARTMENT PORTAL                             │
│  Tanzania Police Force — Dar es Salaam Region         │
├──────────────────────────────────────────────────────┤
│                                                       │
│  📊 Dashboard                                         │
│  ├── Escalations received this month: 47              │
│  ├── Pending actions: 12                              │
│  ├── Resolved: 35                                     │
│  └── Average response time: 2.3 days                  │
│                                                       │
│  📋 Escalation Requests                               │
│  ├── #ESC-2026-0412 — Dispute: Land boundary          │
│  ├── #ESC-2026-0413 — Bail application letter          │
│  └── #ESC-2026-0414 — Criminal complaint referral      │
│                                                       │
│  📄 Application Copies                                │
│  ├── Auto-forwarded disputes (read-only)              │
│  └── Bail/custody letters requiring action             │
│                                                       │
│  🏢 District Offices                                  │
│  ├── Ilala District Police                            │
│  ├── Kinondoni District Police                        │
│  └── Temeke District Police                           │
│                                                       │
└──────────────────────────────────────────────────────┘
```

**Core features per department portal**:

1. **Dashboard**: Escalation counts, response metrics, pending actions, resolution rates
2. **Escalation Requests**: Incoming requests from ward staff — viewable, actionable, with response workflow
3. **Court Registry** (Legal/Judiciary): Case filing, hearing schedules, verdict records, bail processing
4. **Application Copies**: Auto-forwarded copies of relevant applications from ward level (read-only unless action required)
5. **Department-in-District/Regional**: Each department's portal filters to their geographic jurisdiction
6. **Inter-department referral**: Department A can forward a case to Department B (e.g., Police → Judiciary)

#### Staff Escalation Workflow

Ward staff gain the ability to **escalate applications to government departments**:

```
Staff reviewing         Staff clicks           Department receives       Department
an application    →    "Escalate" button   →   escalation notification  →  takes action
                       Selects department       with full application
                       Adds note/reason         context and attachments
```

**How it works**:

1. Ward staff opens an application (e.g., a land dispute that requires police involvement)
2. Staff clicks **"Escalate to Department"** button on the review panel
3. A dropdown shows **available departments** (only those the admin has created and activated)
4. Staff selects the department (e.g., "Tanzania Police Force — Ilala District")
5. Staff adds an **escalation note** explaining why the department's involvement is needed
6. The system creates an **escalation record** linked to the original application
7. The department's portal shows the escalation with full context (application data, uploaded documents, citizen info, staff notes)
8. The department can: **Accept** (take ownership), **Respond** (provide guidance back to ward staff), or **Refer** (forward to another department)
9. The citizen sees "Escalated to Police Department" in their application timeline
10. Resolution flows back: department marks resolved → ward staff completes the application

**Use cases**:

| Scenario | Ward Action | Department | Department Action |
|----------|------------|------------|-------------------|
| Land dispute turns violent | Escalate dispute application | Police | Investigation, incident report |
| Citizen needs bail letter | Submit Barua ya Utambulisho addressed to police | Police | Receive letter, process bail |
| Dispute requires court hearing | Escalate dispute | Judiciary | Register case, schedule hearing |
| Burial permit — unnatural death | Escalate burial application | Health / Police | Death investigation, medical examiner |
| Construction near protected area | Escalate construction permit | Environment | Environmental impact assessment |
| Business fraud complaint | Escalate dispute | Legal / BRELA | Investigation, regulatory action |
| Child welfare concern | Escalate from staff observation | Social Welfare | Case worker assignment |

#### Data Model for Departments

```sql
-- New tables for Phase 5
CREATE TABLE government_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,              -- "Tanzania Police Force"
  name_sw TEXT,                    -- "Jeshi la Polisi Tanzania"
  code TEXT UNIQUE,                -- "TPF"
  level TEXT CHECK (level IN ('national', 'regional', 'district')),
  parent_department_id UUID,       -- For hierarchy (HQ → Regional → District)
  region TEXT,                     -- Geographic scope
  district TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE department_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  department_id UUID REFERENCES government_departments(id),
  role TEXT CHECK (role IN ('head', 'officer', 'clerk')),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id),
  from_user_id UUID REFERENCES users(id),     -- Ward staff who escalated
  to_department_id UUID REFERENCES government_departments(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'responded', 'referred', 'resolved', 'rejected')),
  escalation_note TEXT,
  response_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE department_application_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id),
  department_id UUID REFERENCES government_departments(id),
  auto_forwarded BOOLEAN DEFAULT FALSE,       -- TRUE if routing rule, FALSE if manual
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 6 — National Scale & Interoperability (15+ Months)

### Multi-Language Support
- **Beyond Swahili/English**: Support for regional languages where applicable
- **RTL support**: For Arabic-speaking coastal communities

### Citizen Portal Expansion
- **Land administration**: Title deed applications, boundary dispute resolution
- **Business licensing**: Trade licenses, health permits, environmental clearances
- **Tax collection**: Property tax, business levy, market fees
- **Community projects**: Participatory budgeting, development fund tracking

### Inter-System Integration
- **TRA (Tanzania Revenue Authority)**: Tax compliance verification
- **BRELA**: Business registration cross-reference
- **RITA**: Birth/death certificate verification
- **Ministry of Lands**: Property ownership verification
- **Immigration**: Passport and visa status
- **NECTA**: Education certificate verification

### Government Dashboard
- **National statistics**: Citizen registration rates, service delivery performance across all wards
- **Ward ranking**: Performance-based comparison across wards nationally
- **Resource allocation**: Data-driven staffing and budget decisions based on demand patterns
- **Transparency portal**: Public-facing statistics on service delivery (Open Government Partnership)

### Mobile App (Native)
- **React Native**: Share 80% of business logic with the web app
- **Push notifications**: Real-time alerts without SMS costs
- **Camera integration**: Direct document scanning with quality guidance
- **Biometric authentication**: Fingerprint/face login on supported devices
- **Offline forms**: Full form completion without internet, sync on reconnect

---

## Technical Debt & Improvements

| Area | Current State | Improvement |
|------|--------------|-------------|
| **Testing** | No test coverage | Add Vitest unit tests + Playwright E2E tests |
| **Error monitoring** | Console.error only | Add Sentry error tracking |
| **CI/CD** | Vercel auto-deploy only | Add GitHub Actions for lint/test/build gates |
| **API layer** | Direct Supabase queries | Add API abstraction layer for easier backend swaps |
| **State management** | React Context | Consider Zustand for complex state flows |
| **Internationalization** | Inline L() helper | Migrate to i18next for proper translation management |
| **Image optimization** | Raw base64 | WebP conversion, compression, lazy loading |
| **Bundle size** | 1.5MB main chunk | Code splitting, lazy-load PDF library on demand |
| **Database** | Single Supabase project | Separate read replica for reporting queries |

---

## Estimated Timeline & Investment

| Phase | Timeline | Focus | Impact |
|-------|----------|-------|--------|
| **Phase 2** | 1–3 months | Payments, NIDA, SMS | Production-ready with real transactions |
| **Phase 3** | 3–6 months | PWA, offline, transfers | Works without internet; citizen mobility |
| **Phase 4** | 6–9 months | Analytics, verification, feedback | Data-driven governance; document trust |
| **Phase 5** | 9–15 months | Department integration, escalation | Cross-government coordination |
| **Phase 6** | 15+ months | National scale, native app, inter-system | Full digital governance platform |

---

## Government Strategy Alignment

This roadmap aligns with:

- **Tanzania e-Government Strategy 2025–2030**: Digital transformation of public services at all levels
- **TAMISEMI Digital Agenda**: Local government modernization and service delivery improvement
- **National ICT Policy**: Leveraging technology for citizen service delivery and government efficiency
- **Open Government Partnership (OGP)**: Transparency, accountability, and citizen participation
- **Tanzania Development Vision 2025**: Building a middle-income nation through digital infrastructure
- **Sustainable Development Goals (SDG 16)**: Effective, accountable, and inclusive institutions at all levels
