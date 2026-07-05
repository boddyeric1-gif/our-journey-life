import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Supabase's OAuth namespace is beta; keep a small typed wrapper.
type AuthorizationDetails = {
  client?: { name?: string | null; logo_uri?: string | null } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};
type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};
function oauth(): OAuthNs {
  return (supabase.auth as unknown as { oauth: OAuthNs }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-[100svh] flex items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <p className="serif-italic text-rust text-lg">Something paused</p>
        <h1 className="mt-3 font-serif text-2xl text-ink">Could not load this request</h1>
        <p className="mt-2 text-sm text-ink-mute">{String((error as Error)?.message ?? error)}</p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("No redirect returned by the authorization server."); return; }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";

  return (
    <main className="min-h-[100svh] flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-mute">Connect</p>
        <h1 className="mt-3 font-serif text-3xl text-ink leading-tight">
          Let <em className="serif-italic text-rust">{clientName}</em> use Our Journey as you?
        </h1>
        <p className="mt-4 text-sm text-ink-soft leading-relaxed">
          {clientName} will be able to read your journey snapshot, your private solo reflections, and your couple's time capsules,
          and add new solo reflections on your behalf. Only your account is shared — your partner's private entries are not.
        </p>
        {error && <p role="alert" className="mt-4 text-sm text-rust">{error}</p>}
        <div className="mt-8 flex gap-2">
          <button
            onClick={() => decide(true)}
            disabled={busy}
            className="btn-primary flex-1 disabled:opacity-60"
          >
            {busy ? "One moment…" : "Approve"}
          </button>
          <button
            onClick={() => decide(false)}
            disabled={busy}
            className="flex-1 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-ink hover:bg-canvas-deep disabled:opacity-60"
          >
            Deny
          </button>
        </div>
      </div>
    </main>
  );
}
