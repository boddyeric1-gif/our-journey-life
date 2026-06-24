import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getCoupleEntitlements } from "@/lib/payments.functions";
import { AppShell } from "@/components/app-shell";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { isPaymentsConfigured } from "@/lib/stripe";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { Lock, Check } from "lucide-react";

type PriceId = 'time_capsule_onetime' | 'the_atlas_onetime' | 'capsule_atlas_bundle_onetime';

export const Route = createFileRoute('/_authenticated/premium')({
  component: PremiumPage,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  head: () => ({ meta: [{ title: "Premium · Our Journey" }] }),
});

const PRODUCTS: Array<{
  id: PriceId;
  name: string;
  price: string;
  tagline: string;
  body: string;
  owns: (e: { timeCapsule: boolean; atlas: boolean }) => boolean;
}> = [
  {
    id: 'time_capsule_onetime',
    name: 'The Time Capsule',
    price: '$9.99',
    tagline: 'Letters that wait for you.',
    body: 'Schedule sealed letters and voice notes that unlock on a future date — an anniversary, a birthday, the moment you need it most.',
    owns: (e) => e.timeCapsule,
  },
  {
    id: 'the_atlas_onetime',
    name: 'The Atlas',
    price: '$9.99',
    tagline: 'A living scrapbook of you two.',
    body: 'Your rhythm, letters, chapters, and themes gathered into a scrapbook you can page through inside the app — and export to your device whenever you want a copy to keep.',
    owns: (e) => e.atlas,
  },
  {
    id: 'capsule_atlas_bundle_onetime',
    name: 'Both, together',
    price: '$14.99',
    tagline: 'Capsule + Atlas.',
    body: 'Unlock both. A small saving for keeping the whole story.',
    owns: (e) => e.timeCapsule && e.atlas,
  },
];

function PremiumPage() {
  const fetchEntitlements = useServerFn(getCoupleEntitlements);
  const ent = useQuery({
    queryKey: ['entitlements'],
    queryFn: () => fetchEntitlements(),
    staleTime: 30_000,
  });
  const [active, setActive] = useState<PriceId | null>(null);
  const configured = isPaymentsConfigured();

  const data = ent.data ?? { coupleId: null, timeCapsule: false, atlas: false };
  const returnUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/checkout-return?session_id={CHECKOUT_SESSION_ID}`
    : '';

  return (
    <>
      <PaymentTestModeBanner />
      <AppShell>
        <div className="px-5 pt-8 pb-6">
          <h1 className="text-2xl font-serif text-ink">Lasting things</h1>
          <p className="mt-2 text-sm text-ink-mute leading-relaxed">
            Two optional unlocks. One-time payment. Yours forever, for both of you.
          </p>
        </div>

        {!data.coupleId && (
          <div className="mx-5 mb-6 surface-card p-4 text-sm text-ink-mute">
            <Lock className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            Pair with your partner first. Premium unlocks live on your shared journey.
            <div className="mt-3">
              <Link to="/profile" className="text-rust underline">Go to pairing</Link>
            </div>
          </div>
        )}

        <div className="px-5 space-y-4">
          {PRODUCTS.map(p => {
            const owned = p.owns(data);
            return (
              <article key={p.id} className="surface-card p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-lg font-serif text-ink">{p.name}</h2>
                  <span className="text-sm font-medium text-ink">{p.price}</span>
                </div>
                <p className="mt-1 text-sm text-ink italic">{p.tagline}</p>
                <p className="mt-3 text-sm text-ink-mute leading-relaxed">{p.body}</p>
                <div className="mt-4">
                  {owned ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-rust">
                      <Check className="h-4 w-4" /> Unlocked
                    </span>
                  ) : (
                    <button
                      onClick={() => setActive(p.id)}
                      disabled={!data.coupleId || !configured}
                      className="w-full rounded-xl bg-ink text-card py-3 text-sm font-medium disabled:opacity-40"
                    >
                      Unlock
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <p className="px-5 mt-6 text-xs text-ink-mute leading-relaxed">
          14-day refund, no questions. Refunds and disputes revoke access automatically.
        </p>

        {active && (
          <div
            className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setActive(null)}
          >
            <div
              className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-ink/10">
                <span className="text-sm font-medium text-ink">Checkout</span>
                <button onClick={() => setActive(null)} className="text-sm text-ink-mute">Close</button>
              </div>
              <StripeEmbeddedCheckout priceId={active} returnUrl={returnUrl} />
            </div>
          </div>
        )}
      </AppShell>
    </>
  );
}
