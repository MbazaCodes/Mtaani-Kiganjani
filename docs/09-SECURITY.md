# Security Architecture

## Threat Model & Mitigations

### Authentication Security

| Threat               | Mitigation                                            |
| -------------------- | ----------------------------------------------------- |
| Brute force login    | Supabase Auth built-in rate limiting                  |
| Session hijacking    | JWT tokens with expiry + auto-refresh; HTTPS only     |
| Email enumeration    | Supabase Auth does not reveal whether an email exists |
| Privilege escalation | Role checked server-side via RLS and API function     |
| Token theft          | Short-lived JWTs (1 hour); refresh tokens rotate      |

### Data Security

| Threat                      | Mitigation                                                       |
| --------------------------- | ---------------------------------------------------------------- |
| Unauthorized data access    | Row-Level Security on every table                                |
| Staff accessing other wards | Region-scoped queries; staff see only assigned region            |
| Service role key exposure   | Key stored ONLY in server-side Vercel function; never in browser |
| SQL injection               | Parameterized queries via Supabase SDK                           |
| XSS (Cross-Site Scripting)  | React's built-in escaping; no dangerouslySetInnerHTML            |
| CSRF                        | JWT-based auth (no cookies); Supabase handles CORS               |

### Activity Logging

All key actions are logged to `activity_logs` with user ID, action type, severity, and metadata:

- **Login/logout** — tracks who accessed the system and when
- **Application submission** — records service type, application number
- **Application approval** — records approving officer and application details
- **Escalation to departments** — tracks which department received the case

Logs are fire-and-forget (never block the user's action) and viewable in Admin → Activity Logs with filtering by type, severity, date, and user.

### Document Security

| Threat                 | Mitigation                                                               |
| ---------------------- | ------------------------------------------------------------------------ |
| Certificate forgery    | QR verification code on every document                                   |
| Document tampering     | QR encodes application reference + ID; verifiable against database       |
| Unauthorized downloads | Status must be "issued" to access download                               |
| Signature forgery      | Electronic signatures are timestamped and tied to authenticated sessions |

---

## Environment Variable Security

```
SAFE TO EXPOSE (client-side):          NEVER EXPOSE (server-side only):
├── VITE_SUPABASE_URL                  ├── SUPABASE_SERVICE_ROLE_KEY
├── VITE_SUPABASE_ANON_KEY             └── SUPABASE_URL (server copy)
└── VITE_SUPABASE_PUBLISHABLE_KEY

The VITE_ prefix is what determines exposure. Vite embeds VITE_* vars
into the JavaScript bundle at build time. Non-VITE_ vars are only
accessible in server-side code (Vercel functions).
```

---

## Secure Admin Operations

All privileged operations (user creation, password reset, email confirmation) go through the `/api/admin` serverless function:

```
Browser                    Vercel Server              Supabase
  │                           │                          │
  │  POST /api/admin          │                          │
  │  Authorization: Bearer <JWT>                         │
  │  { action: "createUser" } │                          │
  │ ─────────────────────────▶│                          │
  │                           │  1. Validate JWT          │
  │                           │  2. Check role=admin      │
  │                           │     (query users table)   │
  │                           │  3. Use SERVICE_ROLE_KEY  │
  │                           │ ────────────────────────▶ │
  │                           │                          │ Create user
  │                           │ ◀──────────────────────── │
  │ ◀─────────────────────────│  Return userId            │
  │  { userId: "..." }        │                          │
```

---

## Data Privacy

### Personal Data Handling

- All personal data stored in PostgreSQL with encryption at rest (Supabase managed)
- No personal data in URL parameters or browser history
- Profile photos and documents stored as base64 (no external URLs that could leak)
- Session tokens stored in memory (not localStorage) for sensitive operations

### Compliance Considerations

- **Tanzania Data Protection Act**: Personal data processed with consent (terms acceptance in forms)
- **Right to access**: Citizens can view all their stored data in their profile
- **Data minimization**: Only data necessary for the service is collected
- **Audit trail**: All data access and modifications logged
