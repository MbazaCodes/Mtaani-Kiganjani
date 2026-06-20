# Security Fixes — Implementation Guide

## Fix 1: Remove X-User-Id Bypass (CRITICAL)

**File:** `src/lib/auth.ts` (Next.js migration) or equivalent server auth

**Current broken code:**
```typescript
// REMOVE THIS ENTIRE BLOCK — it allows impersonation
const userId = request.headers.get("X-User-Id");
if (userId) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (user && user.accountStatus === "ACTIVE") {
    return { user: stripSensitiveFields(user), error: null };
  }
  // ...
}
```

**Replacement — auth.ts (secure version):**
```typescript
export async function authenticateRequest(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get("Authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      user: null,
      error: NextResponse.json<ApiResponse>(
        { success: false, error: "Unauthorized", message: "Bearer token required." },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.slice(7);
  if (!token) {
    return { user: null, error: unauthorizedResponse("Invalid token format") };
  }

  const user = await db.user.findUnique({ where: { token } });
  
  if (!user) {
    return { user: null, error: unauthorizedResponse("Invalid or expired token") };
  }

  // Token expiry check
  if (user.tokenExpiresAt && user.tokenExpiresAt < new Date()) {
    // Clean up expired token
    await db.user.update({ where: { id: user.id }, data: { token: null, tokenExpiresAt: null } });
    return { user: null, error: unauthorizedResponse("Token expired. Please log in again.") };
  }

  if (user.accountStatus !== "ACTIVE") {
    return {
      user: null,
      error: NextResponse.json<ApiResponse>(
        { success: false, error: "Account suspended", message: `Account is ${user.accountStatus}` },
        { status: 403 }
      ),
    };
  }

  return { user: stripSensitiveFields(user), error: null };
}
```

---

## Fix 2: Add tokenExpiresAt to Prisma Schema

**File:** `prisma/schema.prisma`

Add to User model:
```prisma
model User {
  // ... existing fields ...
  token            String?   @unique
  tokenExpiresAt   DateTime? @map("token_expires_at")  // ADD THIS LINE
  // ...
  @@index([token])  // ADD THIS for faster token lookups
}
```

Run: `npx prisma migrate dev --name add-token-expiry`

---

## Fix 3: Set Token Expiry on Login

**File:** `src/app/api/auth/login/route.ts`

```typescript
const TOKEN_EXPIRY_DAYS = 7; // reduce from 30 to 7 days
const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
const token = crypto.randomUUID();

const updatedUser = await db.user.update({
  where: { id: user.id },
  data: { token, tokenExpiresAt: expiresAt },  // STORE EXPIRY IN DB
});
```

---

## Fix 4: Server-Side Rate Limiting

**New file:** `src/lib/server-rate-limit.ts`

```typescript
// In-memory rate limiter (replace with Redis for multi-instance deployment)
const ipMap = new Map<string, { count: number; resetAt: number }>();

export function serverRateLimit(
  ip: string,
  key: string,
  maxRequests = 5,
  windowMs = 60_000
): { allowed: boolean; retryAfter?: number } {
  const mapKey = `${ip}:${key}`;
  const now = Date.now();
  const entry = ipMap.get(mapKey);

  if (!entry || entry.resetAt < now) {
    ipMap.set(mapKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}
```

**Usage in login route:**
```typescript
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limit = serverRateLimit(ip, "login", 5, 60_000); // 5 per minute
  
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests", message: `Try again in ${limit.retryAfter}s` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }
  // ... rest of handler
}
```

---

## Fix 5: Staff Department Isolation

**File:** `src/app/api/applications/route.ts`

```typescript
// Replace the current STAFF block:
if (auth.user.role === "STAFF") {
  // Staff ONLY see applications assigned to them OR unassigned in their department
  where.OR = [
    { assignedStaffId: auth.user.id },
    {
      assignedStaffId: null,
      assignedOfficeId: auth.user.departmentId ?? undefined, // department-scoped
    },
  ];
}
```

---

## Fix 6: Content Security Policy Headers

**File:** `next.config.ts`

```typescript
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // tighten after testing
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://api.anthropic.com",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true, // re-enable strict mode
  typescript: { ignoreBuildErrors: false }, // fix errors properly
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
```

---

## Fix 7: .gitignore Additions

Add to `.gitignore`:
```
# Database files
*.db
*.db-journal
*.db-shm
*.db-wal
prisma/*.db

# Environment
.env
.env.local
.env.production

# Secrets
*.pem
*.key
```
