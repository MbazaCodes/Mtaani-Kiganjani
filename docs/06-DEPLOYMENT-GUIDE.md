# Deployment & Setup Guide

## Prerequisites

- **Node.js** 18+ and npm
- **Git**
- **Supabase account** (free tier sufficient for development)
- **Vercel account** (free tier sufficient)
- **GitHub repository** connected to Vercel

---

## Local Development Setup

### 1. Clone and Install

```bash
git clone https://github.com/MbazaCodes/Mtaani-Kiganjani.git
cd Mtaani-Kiganjani
npm install
```

### 2. Configure Environment Variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
# CLIENT-SIDE (embedded in browser — safe)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
VITE_SUPABASE_ANON_KEY=eyJ...your_anon_key

# SERVER-SIDE ONLY (for Vercel functions — never VITE_ prefix)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key
```

> **CRITICAL**: The `SUPABASE_SERVICE_ROLE_KEY` must NEVER have a `VITE_` prefix. The `VITE_` prefix causes Vite to embed the value in the browser bundle, exposing it publicly.

### 3. Set Up the Database

In Supabase Dashboard → SQL Editor, run these in order:

1. `supabase/e_serikali_schema.sql` — Creates all 16 core tables, RLS policies, triggers, and functions
2. `supabase/add_signature_stamp_columns.sql` — Adds signature_url/stamp_url to users table
3. `supabase/add_activity_log_columns.sql` — Adds action_type/severity/status to activity_logs
4. `supabase/add_government_departments.sql` — Creates 4 department tables + seeds 52 Tanzania departments

### 4. Configure Supabase Authentication

In Supabase Dashboard → Authentication → URL Configuration:

| Setting | Value |
|---------|-------|
| Site URL | `http://localhost:5173` (dev) or your Vercel domain (prod) |
| Redirect URLs | `http://localhost:5173/**`, `https://your-domain.vercel.app/**` |

### 5. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Production Deployment (Vercel)

### 1. Connect Repository

In Vercel Dashboard → New Project → Import `MbazaCodes/Mtaani-Kiganjani`.

Vercel auto-detects the `vercel.json` configuration:
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

### 2. Set Environment Variables

In Vercel → Project Settings → Environment Variables, add:

| Variable | Scope | Value |
|----------|-------|-------|
| `VITE_SUPABASE_URL` | All | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | All | Publishable key |
| `VITE_SUPABASE_ANON_KEY` | All | Anonymous key |
| `SUPABASE_URL` | All | Same Supabase URL (no VITE_ prefix) |
| `SUPABASE_SERVICE_ROLE_KEY` | All | Service role key (no VITE_ prefix) |

### 3. Update Supabase Auth URLs

In Supabase → Authentication → URL Configuration:

| Setting | Value |
|---------|-------|
| **Site URL** | `https://mtaani-kiganjani-two.vercel.app` |
| **Redirect URLs** | `https://mtaani-kiganjani-two.vercel.app/**` |

### 4. Deploy

Push to `main` branch → Vercel auto-deploys. First deployment takes ~2 minutes.

### 5. Verify

- Visit the production URL
- Sign up as a citizen → confirm email → log in
- Create an admin account via Supabase Dashboard (insert into `users` table with `role: 'admin'`)

---

## Creating the First Admin Account

Since there's no admin yet, create one directly in Supabase:

1. **Sign up** through the app as a normal citizen
2. In Supabase Dashboard → Table Editor → `users`:
   - Find the user you just created
   - Change `role` from `citizen` to `admin`
   - Set `is_verified` to `true`
3. Log out and back in — the admin dashboard is now accessible

---

## Build Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier formatting |

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Stale dev server / errors | `Remove-Item -Recurse -Force node_modules\.vite` then `npm run dev` |
| Multiple dev servers (port 5174+) | `taskkill /F /IM node.exe` then restart |
| Email confirmation redirects to localhost | Set Site URL in Supabase Auth settings |
| Admin actions fail (create user, etc.) | Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel env vars (no VITE_ prefix) |
| PDF download crashes | Clear Vite cache, ensure `@react-pdf/renderer` in `optimizeDeps` |
