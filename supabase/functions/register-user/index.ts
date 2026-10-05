import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RegisterUserBody = {
  email?: string;
  password?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  sex?: string;
  phone?: string;
  nida_number?: string;
  region?: string;
  district?: string;
  ward?: string;
  street?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return json({ error: { code: "METHOD_NOT_ALLOWED", message: "POST required" } }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      { error: { code: "SERVER_MISCONFIGURED", message: "Registration service is unavailable." } },
      503,
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return json({ error: { code: "UNAUTHENTICATED", message: "Sign in is required." } }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerData, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !callerData.user) {
    return json(
      { error: { code: "UNAUTHENTICATED", message: "Invalid or expired session." } },
      401,
    );
  }

  const { data: callerProfile, error: profileError } = await admin
    .from("users")
    .select("role")
    .eq("id", callerData.user.id)
    .maybeSingle();

  if (profileError || !callerProfile || !["admin", "staff"].includes(callerProfile.role)) {
    return json(
      { error: { code: "FORBIDDEN", message: "Staff or admin access is required." } },
      403,
    );
  }

  let body: RegisterUserBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: { code: "INVALID_JSON", message: "Invalid request body." } }, 400);
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const firstName = body.first_name?.trim() ?? "";
  const lastName = body.last_name?.trim() ?? "";
  const phone = body.phone?.trim() || null;

  if (!email || !password || !firstName || !lastName) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Email, password, first name and last name are required.",
        },
      },
      400,
    );
  }
  if (password.length < 8) {
    return json(
      { error: { code: "WEAK_PASSWORD", message: "Password must be at least 8 characters." } },
      400,
    );
  }

  const { data: existingProfile } = await admin
    .from("users")
    .select("id, email, phone")
    .or(`email.eq.${email}${phone ? `,phone.eq.${phone}` : ""}`)
    .limit(1)
    .maybeSingle();

  if (existingProfile) {
    return json(
      {
        error: {
          code: "ACCOUNT_EXISTS",
          message: "A citizen account with that email or phone already exists.",
        },
      },
      409,
    );
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });

  if (createError || !created.user) {
    const message = createError?.message ?? "Could not create citizen account.";
    const duplicate = /already|registered|exists/i.test(message);
    return json(
      {
        error: {
          code: duplicate ? "ACCOUNT_EXISTS" : "AUTH_CREATE_FAILED",
          message: duplicate ? "An account with that email already exists." : message,
        },
      },
      duplicate ? 409 : 400,
    );
  }

  const profile = {
    id: created.user.id,
    email,
    first_name: firstName,
    middle_name: body.middle_name?.trim() || null,
    last_name: lastName,
    sex: body.sex?.trim() || null,
    phone,
    nida_number: body.nida_number?.trim() || null,
    region: body.region?.trim() || null,
    district: body.district?.trim() || null,
    ward: body.ward?.trim() || null,
    street: body.street?.trim() || null,
    role: "citizen",
    account_status: "active",
  };

  const { error: upsertError } = await admin.from("users").upsert(profile, { onConflict: "id" });
  if (upsertError) {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    return json(
      {
        error: { code: "PROFILE_CREATE_FAILED", message: "Citizen profile could not be created." },
      },
      500,
    );
  }

  return json({ user: { id: created.user.id, email }, created: true }, 201);
});
