# Partner "active" presence indicator

Four coordinated changes. Capacitor is already installed (`@capacitor/app` 8.1).

---

## 1. Migration — `profiles.last_active_at` + realtime

- Add `last_active_at timestamptz` (nullable) to `public.profiles`.
- Add `public.profiles` to `supabase_realtime` publication so partner UPDATEs broadcast.
- `REPLICA IDENTITY FULL` on `profiles` so the realtime payload carries the changed `last_active_at`.

Existing RLS already allows `auth.uid() = id OR shares_couple_with(id)` for SELECT and self-only for UPDATE — no policy changes needed. Partners can read each other's `last_active_at` exactly as they read `display_name` today.

## 2. `src/hooks/use-partner-presence.ts`

Signature: `usePartnerPresence({ userId, partnerId }: { userId: string | null; partnerId: string | null; initialPartnerLastActiveAt?: string | null }) => { partnerLastActiveAt: string | null; status: "active-now" | "active-today" | null; statusLabel: string | null }`.

- **Heartbeat:** on mount and every 60s while the tab is visible, `supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", userId)`. Skip when `userId` is null. Throttled so a refresh storm doesn't write per render. Errors swallowed (presence is best-effort).
- **Foreground re-heartbeat:** dynamic-import `@capacitor/app`, call `App.addListener("appStateChange", ({ isActive }) => { if (isActive) heartbeat(); })`. Dynamic import + try/catch so SSR and web builds (where the native plugin is unavailable) don't break. Also listen to `document.visibilitychange` for browser users — same handler. Clean up both listeners on unmount.
- **Subscribe to partner row:** when `partnerId` is set, `supabase.channel(\`partner-presence:\${partnerId}\`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: \`id=eq.\${partnerId}\` }, ({ new: row }) => setPartnerLastActiveAt(row.last_active_at)).subscribe()`. Teardown with `supabase.removeChannel(channel)` in the cleanup. Re-create the channel if `partnerId` changes.
- **Initial value:** seed `partnerLastActiveAt` state from `initialPartnerLastActiveAt` so the indicator shows on first render without waiting for an UPDATE.
- **Derived status:** recompute every minute via a `setInterval` tick so "Active now" → "Active today" → null transition without a realtime event.
  - within 5 min → `{ status: "active-now", statusLabel: "Active now" }`
  - within 24 h → `{ status: "active-today", statusLabel: "Active today" }`
  - otherwise → `{ status: null, statusLabel: null }`

## 3. `getHomeState` / `src/lib/home.functions.ts`

In the partner profile read (line 77), extend the column list to `"id, display_name, avatar_url, last_active_at"`. No type changes elsewhere — the partner shape is consumed as `any` in the route. Re-export through whichever return type is used; `last_active_at` is `string | null`.

## 4. UI — small dot + label on home

New presentational component `src/components/partner-presence-pill.tsx`: renders nothing when `statusLabel` is null; otherwise a small inline chip with a 6px dot and the label, using existing tokens — dot color `bg-emerald-500` for `active-now`, `bg-ink-mute` for `active-today` (no neon, matches the muted palette). Sized as the existing `text-[11px] uppercase tracking-[0.16em]` chips.

In `src/routes/_authenticated/home.tsx`:

- Call `usePartnerPresence({ userId: profile?.id ?? null, partnerId: data.kind === "paired" ? data.partner?.id ?? null : null, initialPartnerLastActiveAt: data.kind === "paired" ? data.partner?.last_active_at ?? null : null })`.
- Render `<PartnerPresencePill name={partnerName} statusLabel={statusLabel} status={status} />` immediately below `LevelHeader` (above the "Working on" / coupleProgress strip) when `data.partner && statusLabel`. Layout: `px-5 -mt-1 mb-2 flex items-center gap-2 text-[12px] text-ink-mute` — "{partnerName} · <dot> Active now".
- Keep it out of `LevelHeader` itself so the existing component stays presentational and partner-agnostic.

---

## Verification

- Sign in as one half of a paired couple in two browsers. Confirm:
  - The partner-side pill flips to "Active now" within seconds of the other browser opening home.
  - Closing the partner tab → after ~5 min the pill becomes "Active today" without a refresh (interval tick).
  - Background → foreground on iOS (Capacitor) bumps `last_active_at` and the other side sees the change.
- Solo (no partner) account: hook returns null, no pill rendered, no realtime subscription created (verify in network panel).
- Confirm no RLS errors in the console on the self-UPDATE.

## Out of scope

- Typing indicators or any "is composing" signal.
- Last-seen exact timestamps ("Active 12 min ago") — three buckets only.
- Push notifications when the partner comes online.
- Surfacing `last_active_at` anywhere outside the home route.
- Storing presence in a separate table — `profiles.last_active_at` is enough and keeps the read on the existing partner fetch.
