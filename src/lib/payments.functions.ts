import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

// Map a price_id to the product slug we store on couple_entitlements.
// Bundle grants both unlocks.
export function entitlementsForPrice(priceId: string): Array<'time_capsule' | 'the_atlas'> {
  switch (priceId) {
    case 'time_capsule_onetime': return ['time_capsule'];
    case 'the_atlas_onetime': return ['the_atlas'];
    case 'capsule_atlas_bundle_onetime': return ['time_capsule', 'the_atlas'];
    default: return [];
  }
}

type CheckoutResult = { clientSecret: string } | { error: string };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error('Invalid userId');
  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}

export const createPremiumCheckout = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    priceId: z.enum(['time_capsule_onetime', 'the_atlas_onetime', 'capsule_atlas_bundle_onetime']),
    returnUrl: z.string().url(),
    environment: z.enum(['sandbox', 'live']),
  }).parse(d))
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const { userId, supabase } = context;
      const env: StripeEnv = data.environment;
      const stripe = createStripeClient(env);

      // Need a couple to assign the unlock to.
      const { data: profile } = await supabase
        .from('profiles').select('current_couple_id').eq('id', userId).maybeSingle();
      const coupleId = profile?.current_couple_id as string | null | undefined;
      if (!coupleId) return { error: "Pair with your partner before unlocking premium features." };

      // Block re-purchase if already owned.
      const products = entitlementsForPrice(data.priceId);
      const { data: existing } = await supabase
        .from('couple_entitlements')
        .select('product')
        .eq('couple_id', coupleId)
        .eq('status', 'active')
        .in('product', products);
      const owned = new Set((existing ?? []).map(r => r.product as string));
      const stillNeeded = products.filter(p => !owned.has(p));
      if (stillNeeded.length === 0) return { error: 'You already own this.' };

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) return { error: 'Price not found' };
      const stripePrice = prices.data[0];

      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email ?? undefined;

      const customerId = await resolveOrCreateCustomer(stripe, { email, userId });

      const productId = typeof stripePrice.product === 'string'
        ? stripePrice.product : stripePrice.product.id;
      const product = await stripe.products.retrieve(productId);

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: 'payment',
        ui_mode: 'embedded_page',
        return_url: data.returnUrl,
        customer: customerId,
        payment_intent_data: { description: product.name },
        metadata: {
          userId,
          coupleId,
          priceId: data.priceId,
        },
      });

      return { clientSecret: session.client_secret ?? '' };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const getCoupleEntitlements = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { computeCoupleProgress } = await import('@/lib/coupleLevel');
    const { trialSnapshot } = await import('@/lib/trial.functions');

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_couple_id, atlas_trial_started_at, timecapsule_trial_started_at')
      .eq('id', userId)
      .maybeSingle();
    const coupleId = profile?.current_couple_id as string | null | undefined;

    const myAtlasTrial = trialSnapshot(profile?.atlas_trial_started_at ?? null);
    const myTimeCapsuleTrial = trialSnapshot(profile?.timecapsule_trial_started_at ?? null);

    if (!coupleId) {
      return {
        coupleId: null,
        timeCapsule: false,
        atlas: false,
        paid: { timeCapsule: false, atlas: false },
        trials: {
          atlas: { mine: myAtlasTrial, coupleActive: myAtlasTrial.active, eligible: !myAtlasTrial.used },
          timeCapsule: { mine: myTimeCapsuleTrial, coupleActive: myTimeCapsuleTrial.active, eligible: !myTimeCapsuleTrial.used },
        },
        progress: null as ReturnType<typeof computeCoupleProgress> | null,
      };
    }

    // Fetch couple members' trial timestamps (RLS: partner readable via shares_couple_with).
    const [{ data: rows }, { data: xpVal }, { data: daysVal }, tcUnlockedRes, atlasUnlockedRes, { data: memberProfiles }] = await Promise.all([
      supabase
        .from('couple_entitlements')
        .select('product, status')
        .eq('couple_id', coupleId)
        .eq('status', 'active'),
      supabase.rpc('couple_total_xp', { _couple_id: coupleId }),
      supabase.rpc('couple_shared_days', { _couple_id: coupleId }),
      supabase.rpc('couple_unlocked', { _couple_id: coupleId, _product: 'time_capsule' }),
      supabase.rpc('couple_unlocked', { _couple_id: coupleId, _product: 'the_atlas' }),
      supabase
        .from('couple_members')
        .select('user_id, profiles!inner(atlas_trial_started_at, timecapsule_trial_started_at)')
        .eq('couple_id', coupleId),
    ]);

    const set = new Set((rows ?? []).map(r => r.product as string));
    const paid = { timeCapsule: set.has('time_capsule'), atlas: set.has('the_atlas') };
    const progress = computeCoupleProgress(Number(xpVal ?? 0), Number(daysVal ?? 0), {
      time_capsule: paid.timeCapsule,
      the_atlas: paid.atlas,
    });

    let atlasCoupleActive = false;
    let timeCapsuleCoupleActive = false;
    for (const m of memberProfiles ?? []) {
      const p = (m as unknown as { profiles: { atlas_trial_started_at: string | null; timecapsule_trial_started_at: string | null } }).profiles;
      if (trialSnapshot(p?.atlas_trial_started_at).active) atlasCoupleActive = true;
      if (trialSnapshot(p?.timecapsule_trial_started_at).active) timeCapsuleCoupleActive = true;
    }

    // Authoritative unlock includes admin bypass + paid + earned + trial (via DB fn).
    const timeCapsule = tcUnlockedRes.data ?? (progress.unlocks.time_capsule || timeCapsuleCoupleActive);
    const atlas = atlasUnlockedRes.data ?? (progress.unlocks.the_atlas || atlasCoupleActive);

    return {
      coupleId,
      timeCapsule,
      atlas,
      paid,
      trials: {
        atlas: { mine: myAtlasTrial, coupleActive: atlasCoupleActive, eligible: !myAtlasTrial.used && !paid.atlas },
        timeCapsule: { mine: myTimeCapsuleTrial, coupleActive: timeCapsuleCoupleActive, eligible: !myTimeCapsuleTrial.used && !paid.timeCapsule },
      },
      progress,
    };
  });


