import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";

const XENDIT_SECRET_KEY = Deno.env.get("XENDIT_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://pickle-pass.netlify.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(token);

    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { session_id, tournament_id, booking_id, amount, service_fee, description, payment_method } = body;

    const total = amount + service_fee;

    // Create Xendit Invoice
    const xenditRes = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(XENDIT_SECRET_KEY + ":")}`,
      },
      body: JSON.stringify({
        external_id: `pp_${user.id}_${Date.now()}`,
        amount: total,
        currency: "PHP",
        description: description || "Pickle Pass Payment",
        payment_methods: payment_method === "maya"
          ? ["PAYMAYA"]
          : payment_method === "gcash"
          ? ["GCASH"]
          : ["GCASH", "PAYMAYA"],
        success_redirect_url: `${APP_URL}?payment=success`,
        failure_redirect_url: `${APP_URL}?payment=failed`,
        metadata: {
          profile_id: user.id,
          session_id: session_id || null,
          tournament_id: tournament_id || null,
          booking_id: booking_id || null,
        },
      }),
    });

    if (!xenditRes.ok) {
      const errBody = await xenditRes.text();
      console.error("Xendit error:", errBody);
      return new Response(JSON.stringify({ error: "Payment gateway error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invoice = await xenditRes.json();

    // Save payment record
    await supabase.from("payments").insert({
      profile_id: user.id,
      session_id: session_id || null,
      tournament_id: tournament_id || null,
      booking_id: booking_id || null,
      xendit_invoice_id: invoice.id,
      xendit_invoice_url: invoice.invoice_url,
      amount,
      service_fee,
      total,
      payment_method: payment_method || "gcash",
      status: "pending",
    });

    return new Response(
      JSON.stringify({
        invoice_url: invoice.invoice_url,
        invoice_id: invoice.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
