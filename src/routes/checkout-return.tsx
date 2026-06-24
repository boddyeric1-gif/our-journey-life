import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute('/checkout-return')({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === 'string' ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  head: () => ({ meta: [{ title: "Thank you · Our Journey" }] }),
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  const qc = useQueryClient();
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['entitlements'] });
  }, [qc]);

  return (
    <AppShell>
      <div className="px-5 pt-16 pb-10 max-w-md mx-auto text-center">
        {session_id ? (
          <>
            <h1 className="text-2xl font-serif text-ink">Thank you.</h1>
            <p className="mt-3 text-sm text-ink-mute leading-relaxed">
              Your unlock is being prepared. It usually appears within a few seconds.
            </p>
          </>
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
