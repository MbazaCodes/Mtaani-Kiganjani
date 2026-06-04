/**
 * Vercel Serverless Function — admin operations.
 *
 * The Supabase SERVICE ROLE key lives ONLY here, on the server. It is never
 * shipped to the browser. The client calls this endpoint; this function
 * verifies the caller is an authenticated admin/staff before performing any
 * privileged action.
 *
 * Env vars (set in Vercel project settings, WITHOUT the VITE_ prefix so they
 * stay server-side):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface RequestBody {
  action: "createUser" | "resetPassword" | "confirmEmail";
  // createUser
  email?: string;
  password?: string;
  role?: "staff" | "admin";
  officeId?: string;
  // resetPassword / confirmEmail
  userId?: string;
  newPassword?: string;
}

// Minimal Vercel handler signature (no @vercel/node types needed)
interface VercelReq {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}
interface VercelRes {
  status: (code: number) => VercelRes;
  json: (data: unknown) => void;
}

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error:
        "Server not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.",
    });
  }

  // ── Verify the caller is an authenticated admin/staff ──────────────────────
  const authHeader = req.headers["authorization"];
  const token =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

  if (!token) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Resolve the caller from their JWT
  const { data: caller, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller?.user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  // Check the caller's role in the users table
  const { data: profile, error: profileErr } = await admin
    .from("users")
    .select("role")
    .eq("id", caller.user.id)
    .maybeSingle();

  if (profileErr || !profile || (profile.role !== "admin" && profile.role !== "staff")) {
    return res.status(403).json({ error: "Forbidden: admin or staff access required" });
  }

  // ── Perform the requested privileged action ────────────────────────────────
  const body = (req.body || {}) as RequestBody;

  try {
    switch (body.action) {
      case "createUser": {
        if (!body.email || !body.password || !body.role) {
          return res.status(400).json({ error: "Missing email, password, or role" });
        }
        // Only admins may create staff/admin accounts
        if (profile.role !== "admin") {
          return res.status(403).json({ error: "Only admins can create users" });
        }
        const { data, error } = await admin.auth.admin.createUser({
          email: body.email,
          password: body.password,
          email_confirm: true,
          user_metadata: { role: body.role, office_id: body.officeId ?? "" },
        });
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ userId: data.user?.id ?? null });
      }

      case "resetPassword": {
        if (!body.userId || !body.newPassword) {
          return res.status(400).json({ error: "Missing userId or newPassword" });
        }
        if (profile.role !== "admin") {
          return res.status(403).json({ error: "Only admins can reset passwords" });
        }
        const { error } = await admin.auth.admin.updateUserById(body.userId, {
          password: body.newPassword,
        });
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ ok: true });
      }

      case "confirmEmail": {
        if (!body.userId) {
          return res.status(400).json({ error: "Missing userId" });
        }
        const { error } = await admin.auth.admin.updateUserById(body.userId, {
          email_confirm: true,
        });
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ ok: true });
      }

      default:
        return res.status(400).json({ error: "Unknown action" });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected server error";
    return res.status(500).json({ error: msg });
  }
}
