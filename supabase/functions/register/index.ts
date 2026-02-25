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

    // Validation
    if (!full_name || !username || !password || !mobile_number || !country_code) {
      return new Response(JSON.stringify({ error: "সকল ফিল্ড পূরণ করুন" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Username: English only, 8-12 chars, must contain a number
    const usernameRegex = /^[a-zA-Z0-9]{8,12}$/;
    if (!usernameRegex.test(username)) {
      return new Response(JSON.stringify({ error: "ইউজারনেম ৮-১২ অক্ষর, শুধু ইংরেজি অক্ষর ও সংখ্যা" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/[0-9]/.test(username)) {
      return new Response(JSON.stringify({ error: "ইউজারনেমে কমপক্ষে একটি সংখ্যা থাকতে হবে" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Password: 8-12 chars
    if (password.length < 8 || password.length > 12) {
      return new Response(JSON.stringify({ error: "পাসওয়ার্ড ৮-১২ অক্ষরের হতে হবে" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if username already exists
    const { data: existingUsername } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUsername) {
      return new Response(JSON.stringify({ error: "এই ইউজারনেম ইতিমধ্যে ব্যবহৃত হয়েছে" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if mobile already exists
    const fullMobile = `${country_code}${mobile_number}`;
    const { data: existingMobile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("mobile_number", fullMobile)
      .maybeSingle();

    if (existingMobile) {
      return new Response(JSON.stringify({ error: "এই মোবাইল নম্বর দিয়ে ইতিমধ্যে অ্যাকাউন্ট আছে" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user with fake email
    const fakeEmail = `${username}@myzmessage.app`;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: fakeEmail,
      password: password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(JSON.stringify({ error: "অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // Resolve business_id from slug if provided
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

    // Create profile
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
      // Cleanup: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "প্রোফাইল তৈরি করতে সমস্যা হয়েছে" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign default role as member
    await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: "member",
    });

    // Generate OTP
    const { data: otpCode } = await supabaseAdmin.rpc("generate_otp", { _user_id: userId });

    return new Response(
      JSON.stringify({
        success: true,
        message: "রেজিস্ট্রেশন সফল! অ্যাকাউন্ট সক্রিয় করতে অ্যাডমিনের কাছ থেকে OTP সংগ্রহ করুন।",
        user_id: userId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "সার্ভারে সমস্যা হয়েছে" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
