/**
 * ─────────────────────────────────────────────────────────────────────────────
 * E-MTAA — Secure Auth Utility (REFACTORED)
 * Changes from audit:
 *   - Removed X-User-Id bypass (was a critical impersonation vulnerability)
 *   - Added token expiry check
 *   - Improved error messages for better UX without leaking info
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

// ── Type: stripped user returned from auth ───────────────────────────────────

export type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "CITIZEN" | "STAFF" | "ADMIN";
  verificationTier: "NONE" | "BASIC" | "NIDA_VERIFIED";
  accountStatus: "ACTIVE" | "SUSPENDED" | "DEACTIVATED" | "PENDING_VERIFICATION";
  avatar: string | null;
  nidaNumber: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  address: string | null;
  region: string | null;
  district: string | null;
  ward: string | null;
  occupation: string | null;
  departmentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthResult =
  | { user: SafeUser; error: null }
  | { user: null; error: NextResponse };

// ── Internal helpers ─────────────────────────────────────────────────────────

function unauthorizedResponse(message: string): NextResponse {
  return NextResponse.json<ApiResponse>(
    { success: false, error: "Unauthorized", message },
    { status: 401 }
  );
}

function forbiddenResponse(message: string): NextResponse {
  return NextResponse.json<ApiResponse>(
    { success: false, error: "Forbidden", message },
    { status: 403 }
  );
}

/** Strip sensitive fields from a Prisma user record before returning to client */
export function stripSensitiveFields<T extends Record<string, unknown>>(
  record: T
): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, token, tokenExpiresAt, ...rest } = record as T & {
    passwordHash?: unknown;
    token?: unknown;
    tokenExpiresAt?: unknown;
  };
  return rest as unknown as SafeUser;
}

// ── Main authenticateRequest ─────────────────────────────────────────────────

/**
 * Authenticate an incoming API request via Bearer token.
 *
 * SECURITY NOTES:
 * - X-User-Id header fallback has been REMOVED (was a critical impersonation vector).
 * - Token expiry is now enforced.
 * - Expired tokens are cleared from DB on detection.
 */
export async function authenticateRequest(
  request: Request
): Promise<AuthResult> {
  // Lazy-import db to avoid module-level side effects in edge/test environments
  const { db } = await import("@/lib/db");

  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      user: null,
      error: unauthorizedResponse(
        "Authorization required. Provide a Bearer token in the Authorization header."
      ),
    };
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return {
      user: null,
      error: unauthorizedResponse("Invalid token format."),
    };
  }

  let user;
  try {
    user = await db.user.findUnique({ where: { token } });
  } catch {
    return {
      user: null,
      error: NextResponse.json<ApiResponse>(
        { success: false, error: "Server error", message: "Authentication service unavailable." },
        { status: 503 }
      ),
    };
  }

  if (!user) {
    return {
      user: null,
      error: unauthorizedResponse("Invalid or expired token. Please log in again."),
    };
  }

  // ── Token expiry check ────────────────────────────────────────────────────
  const tokenExpiresAt = (user as { tokenExpiresAt?: Date | null }).tokenExpiresAt;
  if (tokenExpiresAt && tokenExpiresAt < new Date()) {
    // Invalidate expired token
    try {
      await db.user.update({
        where: { id: user.id },
        data: { token: null },
      });
    } catch {
      // Non-fatal — just return 401
    }
    return {
      user: null,
      error: unauthorizedResponse("Your session has expired. Please log in again."),
    };
  }

  // ── Account status check ──────────────────────────────────────────────────
  if (user.accountStatus !== "ACTIVE") {
    const statusMessage: Record<string, string> = {
      SUSPENDED: "Your account has been suspended. Please contact support at support@emtaa.go.tz.",
      DEACTIVATED: "Your account has been deactivated.",
      PENDING_VERIFICATION: "Your account is pending verification. Check your email for instructions.",
    };

    return {
      user: null,
      error: forbiddenResponse(
        statusMessage[user.accountStatus] ?? `Account status: ${user.accountStatus}`
      ),
    };
  }

  return { user: stripSensitiveFields(user as Record<string, unknown>), error: null };
}

// ── requireRole helper ────────────────────────────────────────────────────────

/** Guard that returns a 403 response if the user lacks the required role. */
export function requireRole(
  user: SafeUser,
  roles: Array<"ADMIN" | "STAFF" | "CITIZEN">
): NextResponse | null {
  if (!roles.includes(user.role as "ADMIN" | "STAFF" | "CITIZEN")) {
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: "Forbidden",
        message: `Access denied. Required role(s): ${roles.join(", ")}.`,
      },
      { status: 403 }
    );
  }
  return null;
}

// ── Server-side rate limiting ─────────────────────────────────────────────────

/** In-memory rate limiter. Replace with Redis for multi-instance deployment. */
const _rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function serverRateLimit(
  ip: string,
  key: string,
  maxRequests = 5,
  windowMs = 60_000
): { allowed: boolean; retryAfter?: number } {
  const mapKey = `${ip}:${key}`;
  const now = Date.now();
  const entry = _rateLimitMap.get(mapKey);

  if (!entry || entry.resetAt < now) {
    _rateLimitMap.set(mapKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

/** Build a 429 Too Many Requests response */
export function rateLimitExceededResponse(retryAfter: number): NextResponse {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: "Too Many Requests",
      message: `Too many attempts. Please wait ${retryAfter} seconds and try again.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    }
  );
}
