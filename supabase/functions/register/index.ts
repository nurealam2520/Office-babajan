import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { full_name, username, password, mobile_number, country_code, business_slug } = await req.json();

    if (!full_name || !username || !password || !mobile_number || !country_code) {
      return new Response(JSON.stringify({ error: "All fields are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const usernameRegex = /^[a-zA-Z0-9]{8,12}$/;
    if (!usernameRegex.test(username)) {
      return new Response(JSON.stringify({ error: "Username must be 8-12 characters, English letters and numbers only" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/[0-9]/.test(username)) {
      return new Response(JSON.stringify({ error: "Username must contain at least one number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8 || password.length > 12) {
      return new Response(JSON.stringify({ error: "Password must be 8-12 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existingUsername } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUsername) {
      return new Response(JSON.stringify({ error: "This username is already taken" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullMobile = `${country_code}${mobile_number}`;
    const { data: existingMobile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("mobile_number", fullMobile)
      .maybeSingle();

    if (existingMobile) {
      return new Response(JSON.stringify({ error: "An account already exists with this mobile number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fakeEmail = `${username}@myzmessage.app`;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: fakeEmail,
      password: password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(JSON.stringify({ error: "Failed to create account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    let businessId: string | null = null;
    if (business_slug) {
      const { data: biz } = await supabaseAdmin
        .from("businesses")
        .select("id")
        .eq("slug", business_slug)
        .eq("is_active", true)
        .maybeSingle();
      if (biz) businessId = biz.id;
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: userId,
      full_name,
      username,
      mobile_number: fullMobile,
      country_code,
      is_active: false,
      ...(businessId ? { business_id: businessId } : {}),
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "Failed to create profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Registration successful! Collect an OTP from your admin to activate your account.",
        user_id: userId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
