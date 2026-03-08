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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is a super_admin
    const callerClient = createClient(supabaseUrl, serviceRoleKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const isAdmin = roles?.some((r: any) => r.role === "super_admin" || r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Only admins can delete users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { target_user_id, reason, mobile_number, country_code } = await req.json();

    if (!target_user_id) {
      return new Response(JSON.stringify({ error: "target_user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check target is not a super_admin
    const { data: targetRoles } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", target_user_id);

    if (targetRoles?.some((r: any) => r.role === "super_admin")) {
      return new Response(JSON.stringify({ error: "Cannot delete a super admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block the number if provided
    if (mobile_number) {
      await callerClient.from("blocked_numbers").insert({
        mobile_number,
        country_code: country_code || "+880",
        blocked_by: caller.id,
        reason: reason || null,
      });
    }

    // Delete related data
    await callerClient.from("user_restrictions").delete().eq("user_id", target_user_id);
    await callerClient.from("user_roles").delete().eq("user_id", target_user_id);
    await callerClient.from("user_businesses").delete().eq("user_id", target_user_id);
    await callerClient.from("team_members").delete().eq("user_id", target_user_id);
    await callerClient.from("team_members").delete().eq("team_member_id", target_user_id);
    await callerClient.from("team_chat_members").delete().eq("user_id", target_user_id);
    await callerClient.from("user_locations").delete().eq("user_id", target_user_id);
    await callerClient.from("notifications").delete().eq("user_id", target_user_id);
    await callerClient.from("login_notifications").delete().eq("target_user_id", target_user_id);
    await callerClient.from("otp_codes").delete().eq("user_id", target_user_id);
    await callerClient.from("profiles").delete().eq("user_id", target_user_id);

    // Delete the auth user
    const { error: deleteError } = await callerClient.auth.admin.deleteUser(target_user_id);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
