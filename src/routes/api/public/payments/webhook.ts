import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { entitlementsForPrice } from "@/lib/payments.functions";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

async function grantFromSession(session: any) {
  const supabase = getSupabase();
  const coupleId = session.metadata?.coupleId;
  const userId = session.metadata?.userId;
  const priceId = session.metadata?.priceId;
  if (!coupleId || !priceId) {
    console.error('webhook: missing metadata', { coupleId, priceId });
    return;
  }
  const products = entitlementsForPrice(priceId);
  if (products.length === 0) return;
  if (session.payment_status && session.payment_status !== 'paid') return;

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent : session.payment_intent?.id ?? null;

  for (const product of products) {
    const { error } = await supabase.from('couple_entitlements').upsert({
      couple_id: coupleId,
      product,
      status: 'active',
      purchased_by: userId,
      price_id: priceId,
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      amount_cents: session.amount_total ?? null,
      currency: session.currency ?? null,
      granted_at: new Date().toISOString(),
      revoked_at: null,
      revoke_reason: null,
    }, { onConflict: 'couple_id,product' });
    if (error) {
      console.error('webhook upsert entitlement failed', error);
      continue;
    }

    // Quiet confirmation letter — authored by purchaser, visible to both.
    if (userId) {
      const label = product === 'time_capsule' ? 'The Time Capsule' : 'The Atlas';
      const body = `${label} is unlocked for us. A small, lasting addition to our shared space.`;
      await supabase.from('letters').insert({
        couple_id: coupleId,
        author_id: userId,
        body,
        is_first_letter: false,
      });
    }
  }
}

async function revokeByPaymentIntent(paymentIntentId: string, reason: string) {
  const supabase = getSupabase();
  await supabase.from('couple_entitlements')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoke_reason: reason,
    })
    .eq('stripe_payment_intent_id', paymentIntentId);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await grantFromSession(event.data.object);
      break;
    case 'charge.refunded': {
      const charge = event.data.object as any;
      const pi = typeof charge.payment_intent === 'string'
        ? charge.payment_intent : charge.payment_intent?.id;
      if (pi) await revokeByPaymentIntent(pi, 'refunded');
      break;
    }
    case 'charge.dispute.created':
    case 'charge.dispute.closed': {
      const dispute = event.data.object as any;
      const pi = typeof dispute.payment_intent === 'string'
        ? dispute.payment_intent : dispute.payment_intent?.id;
      const status = dispute.status as string | undefined;
      if (pi && (event.type === 'charge.dispute.created' || status === 'lost')) {
        await revokeByPaymentIntent(pi, `dispute:${status ?? 'open'}`);
      }
      break;
    }
    default:
      console.log('Unhandled event:', event.type);
  }
}

export const Route = createFileRoute('/api/public/payments/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get('env');
        if (rawEnv !== 'sandbox' && rawEnv !== 'live') {
          console.error('Webhook missing/invalid env:', rawEnv);
          return Response.json({ received: true, ignored: 'invalid env' });
        }
        try {
          await handleWebhook(request, rawEnv as StripeEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error('Webhook error:', e);
          return new Response('Webhook error', { status: 400 });
        }
      },
    },
  },
});
