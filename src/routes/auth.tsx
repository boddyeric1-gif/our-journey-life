import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

type Mode = "signin" | "signup";

const PENDING_INVITE_KEY = "rq_pending_invite";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Our Journey" },
      { name: "description", content: "Sign in or create your Our Journey account to begin your quest together." },
      { property: "og:title", content: "Sign in — Our Journey" },
      { property: "og:description", content: "Sign in or create your account to begin your quest together." },
      { property: "og:url", content: "https://our-journey.life/auth" },
    ],
    links: [{ rel: "canonical", href: "https://our-journey.life/auth" }],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode === "signup" ? "signup" : "signin") as Mode,
    join: typeof s.join === "string" ? (s.join as string) : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { mode: initialMode, join } = Route.useSearch();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState(join ?? "");
  const [loading, setLoading] = useState(false);

  const trimmedCode = code.trim().toUpperCase();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(PENDING_INVITE_KEY);
    if (join && !stored) window.localStorage.setItem(PENDING_INVITE_KEY, join);
    if (!code && stored) setCode(stored);
  }, [join, code]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      const pending = (typeof window !== "undefined" && window.localStorage.getItem(PENDING_INVITE_KEY)) || join;
      if (pending) navigate({ to: "/join/$code", params: { code: pending } });
      else navigate({ to: "/home" });
    });
  }, [navigate, join]);

  function rememberCode(c: string | undefined) {
    if (typeof window === "undefined") return;
    if (c && c.length >= 4) window.localStorage.setItem(PENDING_INVITE_KEY, c);
  }

  function goAfterAuth() {
    const c = trimmedCode || join;
    if (c) navigate({ to: "/join/$code", params: { code: c } });
    else navigate({ to: mode === "signup" ? "/onboarding" : "/home" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    rememberCode(trimmedCode || join);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Welcome. Let's begin your quest.");
        goAfterAuth();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        goAfterAuth();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    rememberCode(trimmedCode || join);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) {
        toast.error(result.error.message || "Couldn't sign in with Google.");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      goAfterAuth();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Couldn't sign in with Google.";
      toast.error(message);
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 min-h-[100svh] flex flex-col">
      <header className="px-6 pt-8">
        <Link to="/" className="serif-italic text-rust text-xl">Our Journey</Link>
      </header>

      <section className="flex-1 px-6 pt-12 pb-12 max-w-md mx-auto w-full">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-mute">{mode === "signup" ? "Begin" : "Return"}</p>
        <h1 className="mt-4 font-serif text-4xl text-ink leading-tight">
          {mode === "signup" ? <>The quieter way <em className="serif-italic text-rust">to grow</em> closer.</> : <>Welcome <em className="serif-italic text-rust">back</em>.</>}
        </h1>
        {(join || code) && (
          <p className="mt-3 text-sm text-ink-soft serif-italic">You've been invited to a couple. Sign in to accept.</p>
        )}

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="mt-8 w-full inline-flex items-center justify-center gap-3 rounded-full border border-border bg-card px-5 py-3.5 text-sm font-medium text-ink hover:bg-canvas-deep transition disabled:opacity-60"
        >
          <GoogleMark />
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-ink-mute">
          <div className="flex-1 h-px bg-border" />
          <span>or with email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <LabeledInput label="Your name" value={name} onChange={setName} placeholder="Maya" autoComplete="name" required />
          )}
          <LabeledInput label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" required />
          <LabeledInput label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
          {(join || code) && (
            <LabeledInput
              label="Invite code" value={code}
              onChange={(v) => setCode(v.toUpperCase())}
              placeholder="ABC123"
              autoComplete="off"
              maxLength={12}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 btn-primary disabled:opacity-60"
          >
            {loading ? "One moment…" : mode === "signup" ? "Begin your quest" : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-ink-soft">
          {mode === "signup" ? (
            <>Already have an account?{" "}<button onClick={() => setMode("signin")} className="text-rust underline-offset-4 hover:underline">Sign in</button></>
          ) : (
            <>New here?{" "}<button onClick={() => setMode("signup")} className="text-rust underline-offset-4 hover:underline">Create an account</button></>
          )}
        </p>
      </section>
    </main>
  );
}

function LabeledInput({
  label, value, onChange, ...rest
}: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  const id = `f-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <label htmlFor={id} className="block">
      <span className="text-xs uppercase tracking-[0.14em] text-ink-mute">{label}</span>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
        className="mt-1.5 w-full rounded-2xl border border-border bg-card px-4 py-3 text-base text-ink placeholder:text-ink-mute outline-none focus:border-rust focus:ring-4 focus:ring-ring transition"
      />
    </label>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.63z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.93v2.32A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.96H.93A9 9 0 0 0 0 9c0 1.45.35 2.83.93 4.04l3.04-2.32z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .93 4.96l3.04 2.32C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  );
}
