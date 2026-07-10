import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-md text-center">
        <p className="serif-italic text-rust text-2xl">Our Journey</p>
        <h1 className="mt-6 font-serif text-6xl text-ink">404</h1>
        <h2 className="mt-2 text-lg text-ink-soft">This page slipped between us.</h2>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-rust px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-md text-center">
        <p className="serif-italic text-rust text-xl">Something paused</p>
        <h1 className="mt-4 font-serif text-3xl text-ink">This page didn't load</h1>
        <p className="mt-3 text-sm text-ink-mute">A small hiccup on our end. Try again, or head home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-rust px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-ink hover:bg-canvas-deep"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1A1426" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Our Journey" },
      { name: "google-site-verification", content: "mcbc7Z9vZUAqCQDelNV2IyUS_0OmuFpaBBLn0R7v7PA" },
      { title: "Our Journey — daily rituals for closer love" },
      { name: "description", content: "A quiet quest log for couples. Daily prompts, gentle quests, and the small rituals that keep love alive — meaningful even when only one of you opens it." },
      { property: "og:site_name", content: "Our Journey" },
      { property: "og:title", content: "Our Journey — daily rituals for closer love" },
      { property: "og:description", content: "A quiet quest log for couples. Daily prompts, gentle quests, and the small rituals that keep love alive — meaningful even when only one of you opens it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Our Journey — daily rituals for closer love" },
      { name: "twitter:description", content: "A quiet quest log for couples. Daily prompts, gentle quests, and the small rituals that keep love alive — meaningful even when only one of you opens it." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/7834a996-3245-4d23-b9ec-2b733934de09" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/7834a996-3245-4d23-b9ec-2b733934de09" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative min-h-[100svh]">
        <Outlet />
        <Toaster position="top-center" toastOptions={{ style: { fontFamily: "Instrument Sans, system-ui" } }} />
      </div>
    </QueryClientProvider>
  );
}
