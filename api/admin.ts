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
 *
 * SECURITY: We deliberately do NOT fall back to process.env.VITE_SUPABASE_*
 * here. Variables prefixed with VITE_ are inlined into the browser bundle and
 * would leak the service role key to every site visitor. If the server-only
 * env vars are missing, this function fails loudly instead of silently
 * exposing the key.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface RequestBody {
  action: "createUser" | "resetPassword" | "confirmEmail" | "addDepartmentStaff";
  // createUser
  email?: string;
  password?: string;
  role?: "staff" | "admin";
  officeId?: string;
  // resetPassword / confirmEmail
  userId?: string;
  newPassword?: string;
  // addDepartmentStaff
  departmentId?: string;
  deptRole?: "head" | "officer" | "clerk";
  firstName?: string;
  lastName?: string;
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
    typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

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

      case "addDepartmentStaff": {
        // Atomic: find-or-create the user, set their name, link to the department.
        // Runs with the service role so it bypasses RLS and avoids client races.
        if (!body.email || !body.departmentId) {
          return res.status(400).json({ error: "Missing email or departmentId" });
        }
        if (profile.role !== "admin") {
          return res.status(403).json({ error: "Only admins can add department staff" });
        }

        const email = body.email.trim().toLowerCase();
        const deptRole = body.deptRole || "officer";
        const firstName = body.firstName?.trim() || "Department";
        const lastName = body.lastName?.trim() || "Staff";

        // 1. Look for an existing public.users row by email
        const { data: existing } = await admin
          .from("users")
          .select("id, first_name, last_name, email")
          .eq("email", email)
          .maybeSingle();

        let userId: string;
        let created = false;

        if (existing) {
          userId = existing.id;
        } else {
          // 2a. Maybe the auth user exists but has no public.users row, or is brand new.
          //     Try to create the auth user; if it already exists, look it up.
          if (!body.password || body.password.length < 6) {
            return res
              .status(400)
              .json({ error: "Password (min 6 chars) required to create a new account" });
          }
          const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
            email,
            password: body.password,
            email_confirm: true,
            user_metadata: { role: "staff", first_name: firstName, last_name: lastName },
          });

          if (createErr) {
            // If the auth user already exists, find them via listUsers and proceed
            const alreadyExists =
              createErr.message?.toLowerCase().includes("already") ||
              createErr.message?.toLowerCase().includes("registered");
            if (!alreadyExists) {
              return res.status(400).json({ error: createErr.message });
            }
            const { data: list } = await admin.auth.admin.listUsers();
            const match = list?.users.find((u) => u.email?.toLowerCase() === email);
            if (!match) {
              return res
                .status(400)
                .json({ error: "Account exists but could not be located. Try again." });
            }
            userId = match.id;
          } else {
            userId = createdUser.user!.id;
            created = true;
          }
        }

        // 3. Ensure a public.users row exists AND set department_id on the profile.
        //    This is the KEY field the client reads to detect dept membership.
        await admin.from("users").upsert(
          {
            id: userId,
            email,
            first_name: firstName,
            last_name: lastName,
            role: "staff",
            account_status: "active",
            department_id: body.departmentId,
          },
          { onConflict: "id" },
        );

        // 4. Link to department (ignore duplicate)
        const { error: linkErr } = await admin.from("department_users").insert({
          user_id: userId,
          department_id: body.departmentId,
          role: deptRole,
        });
        if (linkErr) {
          if (linkErr.message?.toLowerCase().includes("duplicate")) {
            return res.status(409).json({ error: "User already in this department" });
          }
          return res.status(400).json({ error: linkErr.message });
        }

        return res.status(200).json({ userId, created });
      }

      default:
        return res.status(400).json({ error: "Unknown action" });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected server error";
    return res.status(500).json({ error: msg });
  }
}
