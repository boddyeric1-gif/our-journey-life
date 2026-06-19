import { createFileRoute } from "@tanstack/react-router";

// Lightweight health endpoint for uptime monitors. Public on purpose.
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        }),
    },
  },
});
