# Technical Architecture

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.2 | UI component library |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Vite** | 7.x | Build tool and dev server |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **React Router DOM** | 6.x | Client-side routing |
| **Framer Motion** | 11.x | Page transitions and animations |
| **Lucide React** | 0.575 | Icon library |
| **shadcn/ui** | Latest | Accessible UI component primitives |
| **Recharts** | 2.x | Dashboard charts and analytics |

### PDF Document Generation
| Technology | Purpose |
|-----------|---------|
| **@react-pdf/renderer** | Server-quality PDF generation in the browser |
| **qrcode** | QR code generation for document verification |

### Backend & Database
| Technology | Purpose |
|-----------|---------|
| **Supabase** | PostgreSQL database, authentication, real-time subscriptions, row-level security |
| **Supabase Auth** | User management, email confirmation, session handling |
| **Vercel Serverless Functions** | Secure server-side operations (admin actions) |

### Deployment
| Technology | Purpose |
|-----------|---------|
| **Vercel** | Hosting, CDN, serverless functions, CI/CD |
| **GitHub** | Source control and deployment triggers |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CITIZENS                              │
│              (Mobile / Desktop Browser)                       │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTPS
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE NETWORK                        │
│  ┌───────────────────┐    ┌───────────────────────────────┐ │
│  │   Static Assets    │    │   Serverless Functions        │ │
│  │   (React SPA)      │    │   /api/admin (Node.js)       │ │
│  │   dist/index.html  │    │   - createUser               │ │
│  │   dist/assets/*    │    │   - confirmEmail             │ │
│  └────────┬──────────┘    │   - resetPassword            │ │
│           │               └──────────┬────────────────────┘ │
└───────────┼──────────────────────────┼──────────────────────┘
            │                          │
            ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE CLOUD                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │  PostgreSQL   │  │  Auth         │  │  Storage (future) │ │
│  │  16 tables    │  │  JWT tokens   │  │  Document files   │ │
│  │  RLS enabled  │  │  Email confirm│  │                   │ │
│  │  Triggers     │  │  Sessions     │  │                   │ │
│  └──────────────┘  └──────────────┘  └───────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Architecture

### Authentication Flow
1. Citizens sign up with email + password → Supabase Auth issues JWT
2. Email confirmation link redirects to `/confirm` on the deployed domain
3. All subsequent API requests carry the JWT in the Authorization header
4. Supabase RLS policies enforce access control at the database level

### Service Role Key Protection
The Supabase **service role key** (which bypasses all RLS) is **never shipped to the browser**. It exists only in the Vercel serverless function (`/api/admin`), which:
- Validates the caller's JWT
- Checks their role in the `users` table (must be `admin` or `staff`)
- Only then performs privileged operations (create user, confirm email, reset password)

### Row-Level Security (RLS)
Every table has RLS enabled. Key policies:
- Citizens can only read/update their own records
- Staff can read citizens in their assigned region
- Admins have full read/write access
- Service role bypasses RLS (used only server-side)

### Data Protection
- All communication over HTTPS (enforced by Vercel)
- Passwords hashed by Supabase Auth (bcrypt)
- Session tokens expire and auto-refresh
- No sensitive data in URL parameters
- Document uploads stored as base64 in the database (no external file URLs)

---

## Application Lifecycle

```
Citizen Submits     Staff Reviews      Payment          Document Issued
    ┌──────┐        ┌──────┐        ┌──────┐          ┌──────┐
    │      │        │      │        │      │          │      │
    │ FORM │──────▶ │REVIEW│──────▶ │ PAY  │────────▶ │ PDF  │
    │      │        │      │        │      │          │      │
    └──────┘        └──┬───┘        └──────┘          └──────┘
                       │                                  │
                  ┌────┴────┐                       QR Verification
                  ▼         ▼
              Approve    Reject / Request Info
```

**Application Statuses**: `submitted` → `under_review` → `approved` → `paid` → `issued` (or `rejected` / `returned`)

---

## File Structure

```
Mtaani-Kiganjani/
├── api/                          # Vercel serverless functions
│   └── admin.ts                  # Secure admin operations
├── docs/                         # Project documentation
├── supabase/                     # Database migrations
│   ├── e_serikali_schema.sql     # Full schema (16 tables)
│   └── add_signature_stamp_columns.sql
├── src/
│   ├── components/
│   │   ├── documents/            # 9 PDF templates + shared types
│   │   ├── forms/                # 9 service-specific multi-step forms
│   │   ├── layout/               # AppShell, Sidebar, Header, Nav
│   │   └── ui/                   # shadcn/ui + custom (SignaturePad, etc.)
│   ├── constants/                # Services config, logo, countries
│   ├── context/                  # Auth, App, Language, Toast contexts
│   ├── hooks/                    # Custom hooks (useApplications, useQRCode)
│   ├── integrations/supabase/    # Supabase client configuration
│   ├── lib/                      # Utilities (i18n, currency, QR, admin)
│   ├── pages/
│   │   ├── admin/                # Admin dashboard, staff/citizen/service mgmt
│   │   └── staff/                # Staff dashboard, reviews, verification
│   ├── styles/                   # Global CSS, print styles
│   └── types/                    # TypeScript type definitions
├── vercel.json                   # Deployment configuration
├── vite.config.ts                # Build configuration
└── package.json
```

---

## Performance

- **Build time**: ~17 seconds (2618 modules)
- **Code splitting**: PDF library isolated in separate chunk (cached independently)
- **SPA**: Single-page application — no server round-trips for navigation
- **Lazy QR generation**: QR codes generated only when downloading, not on page load
- **Memoized address data**: 4000+ Tanzania address entries computed once
