import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { username, otp_code, new_password } = await req.json();
    if (!username || !otp_code || !new_password || String(new_password).length < 6) {
      return new Response(JSON.stringify({ error: "Missing or invalid fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find profile by username
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, username")
      .eq("username", String(username).trim())
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find approved reset request matching OTP
    const { data: request } = await supabase
      .from("password_reset_requests")
      .select("id, status, otp_code, used_at")
      .eq("user_id", profile.user_id)
      .eq("otp_code", String(otp_code).trim())
      .eq("status", "approved")
      .is("used_at", null)
      .maybeSingle();

    if (!request) {
      return new Response(JSON.stringify({ error: "Invalid or unapproved OTP" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update password via admin API
    const { error: updErr } = await supabase.auth.admin.updateUserById(profile.user_id, {
      password: new_password,
    });
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark request used and update temp_password for super-admin viewing
    await supabase
      .from("password_reset_requests")
      .update({ status: "used", used_at: new Date().toISOString() })
      .eq("id", request.id);

    await supabase
      .from("profiles")
      .update({ temp_password: new_password })
      .eq("user_id", profile.user_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});