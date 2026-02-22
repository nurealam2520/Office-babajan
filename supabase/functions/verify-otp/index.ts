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
    const { username, otp_code } = await req.json();

    if (!username || !otp_code) {
      return new Response(JSON.stringify({ error: "ইউজারনেম ও OTP দিন" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find user by username
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id, is_active")
      .eq("username", username)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "ইউজার পাওয়া যায়নি" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.is_active) {
      return new Response(JSON.stringify({ error: "অ্যাকাউন্ট ইতিমধ্যে সক্রিয়" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify OTP
    const { data: isValid } = await supabaseAdmin.rpc("verify_otp", {
      _user_id: profile.user_id,
      _code: otp_code,
    });

    if (!isValid) {
      return new Response(JSON.stringify({ error: "OTP সঠিক নয় বা মেয়াদ শেষ হয়েছে" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "অ্যাকাউন্ট সফলভাবে সক্রিয় হয়েছে! এখন লগইন করুন।",
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
