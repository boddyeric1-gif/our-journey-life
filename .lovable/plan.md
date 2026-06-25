# Fix email signup flow

Both bugs verified in `src/routes/auth.tsx` (lines 78, 82–84).

## Code changes

### 1. `src/routes/auth.tsx`
- Change `emailRedirectTo: window.location.origin` to `` `${window.location.origin}/auth/confirm` ``.
- Destructure `{ data: signUpData, error }` from `supabase.auth.signUp(...)`.
- Add `const [emailPending, setEmailPending] = useState(false)`.
- After the error check: if `!signUpData.session`, set `emailPending` to true and return (skip `goAfterAuth`).
- When `emailPending` is true, render a centered "Check your inbox" view instead of the form:
  - Mail icon (lucide-react `Mail`)
  - Heading "Check your inbox" (`font-serif`, rust accent)
  - Shows the submitted email
  - Body copy: confirmation link sent, check spam
  - "Use a different email" ghost button → resets `emailPending` and clears password
  - Matches existing visual style (dark canvas, `text-rust`, `font-serif`, `max-w-md` centered, same header)

### 2. New route `src/routes/auth.confirm.tsx`
Public route. On mount:
- Parse URL hash for `error` / `error_description`. If present, render a friendly error card ("This link has expired") with a button linking to `/auth?mode=signup`.
- Otherwise show "Setting up your account…" with a quiet loading state.
- Subscribe to `supabase.auth.onAuthStateChange`. On `SIGNED_IN` (or if `getUser()` already returns a user at mount), navigate to `/join/$code` when `localStorage["rq_pending_invite"]` exists, else `/onboarding`.
- Clean up the subscription on unmount.
- `head()` with title "Confirming your account — Our Journey" and `noindex` robots meta.

## Backend (I'll handle this — no manual work for you)

The reason confirmation links currently go to a Lovable domain is the Supabase **Site URL** + **Additional Redirect URLs** allowlist. I'll handle this for you in build mode:

1. Inspect the current auth config via the backend tooling I have access to.
2. Update Site URL to `https://our-journey.life` and add the allowlist entries:
   - `https://our-journey.life/**`
   - `https://www.our-journey.life/**`
   - `https://our-jouney-life.lovable.app/**` (published preview)
   - `http://localhost:8080/**` (local dev)
3. Verify the change by re-reading the config.

If the available tooling cannot write that specific setting on Lovable Cloud (some auth settings are read-only via API), I will fall back to giving you a **single click-by-click path inside the Lovable backend UI** — not raw Supabase dashboard steps, since Lovable Cloud doesn't expose that. I'll only ask you to do something if there is literally no programmatic path, and in that case the instructions will be exact.

Nothing else is out of scope.
