/**
 * register-user Edge Function
 * Uses service_role key → bypasses per-IP rate limits on auth.signUp
 * POST body: { email, password, meta }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, password, meta } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "email and password required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service_role key — bypasses RLS and rate limits
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create user via admin API (no rate limit)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      user_metadata: meta ?? {},
      email_confirm: false, // send confirmation email
    });

    if (error) {
      // User already exists
      if (error.message.includes("already been registered") || error.message.includes("already registered")) {
        return new Response(JSON.stringify({ error: "EMAIL_EXISTS" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert profile row immediately (trigger may also do this)
    if (data.user) {
      await supabaseAdmin.from("users").upsert({
        id: data.user.id,
        email: email.toLowerCase().trim(),
        ...meta,
      }, { onConflict: "id" }).catch(() => {});
    }

    return new Response(
      JSON.stringify({ user: { id: data.user?.id, email: data.user?.email } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
