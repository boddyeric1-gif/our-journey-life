import { Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "route_error_component" });
  }, [error]);
  return (
    <main className="min-h-[100svh] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="serif-italic text-rust text-lg">Something paused</p>
        <h1 className="mt-3 font-serif text-2xl text-ink">This page didn't load</h1>
        <p className="mt-2 text-sm text-ink-mute">A small hiccup. Try again, or head home.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="btn-primary"
          >
            Try again
          </button>
          <Link
            to="/home"
            className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-ink hover:bg-canvas-deep"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}

export function RouteNotFound() {
  return (
    <main className="min-h-[100svh] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="serif-italic text-rust text-lg">Our Journey</p>
        <h1 className="mt-3 font-serif text-4xl text-ink">Not here</h1>
        <p className="mt-2 text-sm text-ink-mute">The page slipped between us.</p>
        <Link
          to="/home"
          className="mt-6 inline-block btn-primary"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
