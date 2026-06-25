import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { getCoupleEntitlements } from "@/lib/payments.functions";

export const Route = createFileRoute('/checkout-return')({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === 'string' ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  head: () => ({
    meta: [
      { title: "Thank you · Our Journey" },
      {
        name: "description",
        content:
          "Your Our Journey purchase is being confirmed. We'll unlock your premium features as soon as the payment lands — usually within a few seconds.",
      },
      { property: "og:title", content: "Thank you · Our Journey" },
      {
        property: "og:description",
        content: "Confirming your Our Journey purchase and unlocking your premium features.",
      },
      { property: "og:url", content: "https://our-journey.life/checkout-return" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://our-journey.life/checkout-return" }],
  }),
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  const qc = useQueryClient();
  const fetchEntitlements = useServerFn(getCoupleEntitlements);
  const [polls, setPolls] = useState(0);

  // A5: confirm the entitlement landed before showing success copy.
  const ent = useQuery({
    queryKey: ['entitlements', polls],
    queryFn: () => fetchEntitlements(),
    enabled: !!session_id,
  });

  const ready = !!ent.data && (ent.data.timeCapsule || ent.data.atlas);

  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['entitlements'] });
  }, [qc]);

  // Poll up to 5 times (≈10s) while we wait for the webhook to write the row.
  useEffect(() => {
    if (!session_id || ready || polls >= 5) return;
    const t = window.setTimeout(() => setPolls(p => p + 1), 2000);
    return () => window.clearTimeout(t);
  }, [session_id, ready, polls]);

  return (
    <AppShell>
      <div className="px-5 pt-16 pb-10 max-w-md mx-auto text-center">
        {session_id ? (
          ready ? (
            <>
              <h1 className="text-2xl font-serif text-ink">Thank you.</h1>
              <p className="mt-3 text-sm text-ink-mute leading-relaxed">
                Your unlock is ready. Open it from your profile whenever you like.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-serif text-ink">Almost there.</h1>
              <p className="mt-3 text-sm text-ink-mute leading-relaxed">
                We'll have your unlock ready in a moment. You can wait here, or head back — it'll appear on the premium page as soon as it lands.
              </p>
            </>
          )
        ) : (
          <>
            <h1 className="text-2xl font-serif text-ink">All set.</h1>
            <p className="mt-3 text-sm text-ink-mute">No session information found.</p>
          </>
        )}
        <div className="mt-8 flex flex-col gap-2">
          <Link to="/premium" className="rounded-xl bg-ink text-card py-3 text-sm font-medium">
            Back to premium
          </Link>
          <Link to="/home" className="text-sm text-ink-mute underline">Return home</Link>
        </div>
      </div>
    </AppShell>
  );
}
