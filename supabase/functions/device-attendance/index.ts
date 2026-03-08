import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate device using a shared secret key
    const deviceKey = req.headers.get("x-device-key");
    const expectedKey = Deno.env.get("DEVICE_API_KEY");

    if (!expectedKey) {
      return new Response(
        JSON.stringify({ error: "DEVICE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (deviceKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized device" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || body.action;

    // Action: push attendance records from device
    if (action === "push") {
      const records = Array.isArray(body.records) ? body.records : [body];

      const results = [];
      for (const rec of records) {
        // rec should have: { employee_id, timestamp, type: "check_in" | "check_out", method: "fingerprint" | "face" | "rfid" | "pin", device_id? }
        
        // Look up user by username (employee_id from device maps to username in profiles)
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", rec.employee_id)
          .maybeSingle();

        if (!profile) {
          results.push({ employee_id: rec.employee_id, status: "error", message: "User not found" });
          continue;
        }

        const userId = profile.user_id;
        const timestamp = rec.timestamp || new Date().toISOString();
        const method = rec.method || "unknown";
        const deviceId = rec.device_id || "unknown";
        const note = `🔒 Device: ${deviceId} | Method: ${method}`;

        if (rec.type === "check_in") {
          // Check if already checked in today
          const today = new Date(timestamp).toISOString().split("T")[0];
          const { data: existing } = await supabase
            .from("attendance")
            .select("id")
            .eq("user_id", userId)
            .gte("check_in", today)
            .is("check_out", null)
            .limit(1);

          if (existing && existing.length > 0) {
            results.push({ employee_id: rec.employee_id, status: "skipped", message: "Already checked in" });
            continue;
          }

          const { error } = await supabase.from("attendance").insert({
            user_id: userId,
            check_in: timestamp,
            status: "present",
            note,
            source: "device",
          });

          results.push({
            employee_id: rec.employee_id,
            status: error ? "error" : "ok",
            message: error?.message || "Checked in",
          });
        } else if (rec.type === "check_out") {
          // Find today's open record
          const today = new Date(timestamp).toISOString().split("T")[0];
          const { data: openRecord } = await supabase
            .from("attendance")
            .select("id")
            .eq("user_id", userId)
            .gte("check_in", today)
            .is("check_out", null)
            .order("check_in", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!openRecord) {
            results.push({ employee_id: rec.employee_id, status: "error", message: "No open check-in found" });
            continue;
          }

          const { error } = await supabase
            .from("attendance")
            .update({ check_out: timestamp })
            .eq("id", openRecord.id);

          results.push({
            employee_id: rec.employee_id,
            status: error ? "error" : "ok",
            message: error?.message || "Checked out",
          });
        } else {
          results.push({ employee_id: rec.employee_id, status: "error", message: "Invalid type. Use check_in or check_out" });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: list employees (for device to sync user list)
    if (action === "list_employees") {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("username, full_name, user_id")
        .eq("is_active", true);

      return new Response(JSON.stringify({ employees: profiles || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: push, list_employees" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
