import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.0";

const XENDIT_WEBHOOK_TOKEN = Deno.env.get("XENDIT_WEBHOOK_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Verify webhook token from Xendit
    const callbackToken = req.headers.get("x-callback-token");
    if (callbackToken !== XENDIT_WEBHOOK_TOKEN) {
      console.error("Invalid webhook token");
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { id: invoiceId, status, payment_method, paid_at, metadata } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the payment record
    const { data: payment, error: findErr } = await supabase
      .from("payments")
      .select("*")
      .eq("xendit_invoice_id", invoiceId)
      .single();

    if (findErr || !payment) {
      console.error("Payment not found for invoice:", invoiceId);
      return new Response("OK", { status: 200 });
    }

    if (status === "PAID" || status === "SETTLED") {
      // Update payment record
      await supabase
        .from("payments")
        .update({
          status: "paid",
          payment_method: payment_method || payment.payment_method,
          paid_at: paid_at || new Date().toISOString(),
        })
        .eq("id", payment.id);

      // Confirm session participation
      if (payment.session_id) {
        // Check if already a participant
        const { data: existing } = await supabase
          .from("session_participants")
          .select("id")
          .eq("session_id", payment.session_id)
          .eq("profile_id", payment.profile_id)
          .single();

        if (existing) {
          await supabase
            .from("session_participants")
            .update({ status: "confirmed", payment_id: payment.id })
            .eq("id", existing.id);
        } else {
          // Check capacity
          const { data: session } = await supabase
            .from("sessions")
            .select("cap, walk_ins")
            .eq("id", payment.session_id)
            .single();

          const { count: confirmedCount } = await supabase
            .from("session_participants")
            .select("id", { count: "exact", head: true })
            .eq("session_id", payment.session_id)
            .eq("status", "confirmed");

          const totalFilled = (confirmedCount || 0) + (session?.walk_ins || 0);
          const isFull = session?.cap != null && totalFilled >= session.cap;

          await supabase.from("session_participants").insert({
            session_id: payment.session_id,
            profile_id: payment.profile_id,
            status: isFull ? "waitlisted" : "confirmed",
            payment_id: payment.id,
          });
        }
      }

      // Confirm tournament registration
      if (payment.tournament_id) {
        const { data: existing } = await supabase
          .from("tournament_registrations")
          .select("id")
          .eq("tournament_id", payment.tournament_id)
          .eq("profile_id", payment.profile_id)
          .single();

        if (existing) {
          await supabase
            .from("tournament_registrations")
            .update({ status: "confirmed", payment_id: payment.id })
            .eq("id", existing.id);
        } else {
          await supabase.from("tournament_registrations").insert({
            tournament_id: payment.tournament_id,
            profile_id: payment.profile_id,
            status: "confirmed",
            payment_id: payment.id,
          });
        }
      }
    } else if (status === "EXPIRED" || status === "FAILED") {
      await supabase
        .from("payments")
        .update({ status: status.toLowerCase() })
        .eq("id", payment.id);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
