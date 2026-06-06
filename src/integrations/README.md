# Integrations

This folder holds all external government/service integrations for Mtaani Kiganjani.
Every integration ships **disabled** and returns safe **mock data**, so the app
runs fully in demonstration mode. When you obtain real API access, flip a flag
and implement one function — nothing else in the app needs to change.

## How it works

```
src/integrations/
├── config.ts        ← feature flags (one switch per integration)
├── types.ts         ← shared result/data types
├── index.ts         ← barrel export: import { verifyNida, ... } from "@/integrations"
├── nida/            ← National ID verification
├── tra/             ← Tanzania Revenue Authority (tax)
├── police/          ← Tanzania Police Force (fines, clearance)
├── payments/        ← GePG / mobile money / bank
└── sms/             ← transactional SMS
```

Each integration exposes a single public function that auto-routes:

```ts
import { verifyNida } from "@/integrations";

const result = await verifyNida("1988...0129");
if (result.ok) {
  // result.data.verified, result.source === "mock" | "live"
}
```

## Turning an integration on

1. **Get access** — sign the agreement / register with the provider and obtain
   credentials. (These are access/authorization steps, not code.)
2. **Add env vars** (Vercel → Project → Settings → Environment Variables). Keep
   secrets server-side; only `VITE_ENABLE_*`, base URLs, and non-secret IDs are
   safe in the client bundle.
3. **Flip the flag** — set `VITE_ENABLE_<NAME>=true`.
4. **Implement the `...Live()` function** in that integration's `index.ts`.
   For anything with a secret key (NIDA, TRA, Police, payments, SMS), call a
   **server-side route** (Supabase Edge Function or serverless `/api/...`) from
   the `Live()` function — never put the secret in the browser.

## Recommended sequence

| Order | Integration | Why first |
|-------|-------------|-----------|
| 1 | **Payments (GePG)** | Unlocks the most value; lets the portal collect real fees |
| 2 | **SMS** | Cheap, high-impact; notify citizens of status changes |
| 3 | **NIDA** | Makes identity verification real (raises document trust) |
| 4 | **TRA / Police** | Inter-agency data; enables the obligations/fines features |

## Env var reference

```
# Master switches
VITE_ENABLE_NIDA=false
VITE_ENABLE_TRA=false
VITE_ENABLE_POLICE=false
VITE_ENABLE_PAYMENTS=false
VITE_ENABLE_SMS=false

# Endpoints (set when enabling)
VITE_NIDA_API_URL=
VITE_TRA_API_URL=
VITE_POLICE_API_URL=
VITE_PAYMENT_API_URL=
VITE_PAYMENT_PROVIDER=mock      # gepg | mpesa | tigopesa | airtelmoney
VITE_SMS_PROVIDER=mock          # beem | africastalking | twilio
VITE_SMS_SENDER_ID=E-MTAA

# Secrets — DO NOT put in client. Store as server-side env in your
# Supabase Edge Functions / serverless routes only.
# NIDA_API_KEY=...
# TRA_API_KEY=...
# PAYMENT_MERCHANT_SECRET=...
# SMS_API_KEY=...
```

## Demonstration mode

While all flags are `false`, the app shows a "DEMONSTRATION ONLY" disclaimer in
the UI footer and on every generated PDF. Once real integrations are live you
can use `ANY_INTEGRATION_LIVE` from `config.ts` to adjust that messaging.
