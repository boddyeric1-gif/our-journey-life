import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { routeTree } from "@/routeTree.gen";

const BASE_URL = "https://our-journey.life";

// Routes that should never appear in the sitemap (authenticated app surface,
// post-action landings, and internals). Mirrors `Disallow` rules in
// public/robots.txt — keep the two in sync when hiding a route.
const PRIVATE_PATHS = new Set<string>([
  "/home",
  "/daily",
  "/profile",
  "/onboarding",
  "/quests",
  "/atlas",
  "/premium",
  "/admin",
  "/capsule",
  "/capsule/new",
  "/checkout-return",
  "/auth/confirm",
]);

interface SitemapEntry {
  path: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: string;
}

function defaultsFor(path: string): Omit<SitemapEntry, "path"> {
  if (path === "/") return { changefreq: "weekly", priority: "1.0" };
  if (path.startsWith("/resources/")) return { changefreq: "monthly", priority: "0.7" };
  if (path === "/privacy" || path === "/terms") return { changefreq: "yearly", priority: "0.3" };
  return { changefreq: "monthly", priority: "0.5" };
}

// Recursively walk the generated route tree and collect every concrete
// fullPath. Layout/pathless routes contribute their children but not
// themselves (their fullPath equals the parent's).
function collectPaths(route: unknown, seen: Set<string>): void {
  if (!route || typeof route !== "object") return;
  const r = route as { fullPath?: string; children?: unknown };
  if (typeof r.fullPath === "string") seen.add(r.fullPath);
  const children = r.children;
  if (!children) return;
  if (Array.isArray(children)) {
    for (const c of children) collectPaths(c, seen);
  } else if (typeof children === "object") {
    for (const c of Object.values(children as Record<string, unknown>)) collectPaths(c, seen);
  }
}

function buildEntries(): SitemapEntry[] {
  const all = new Set<string>();
  collectPaths(routeTree, all);

  const entries: SitemapEntry[] = [];
  for (const raw of all) {
    if (!raw) continue;
    // Normalize trailing slash (except root).
    const path = raw !== "/" && raw.endsWith("/") ? raw.slice(0, -1) : raw;
    if (path.includes("$")) continue; // dynamic params — can't enumerate generically
    if (path.startsWith("/api/")) continue; // server endpoints
    if (path === "/sitemap.xml") continue;
    if (PRIVATE_PATHS.has(path)) continue;
    entries.push({ path, ...defaultsFor(path) });
  }

  // Stable order: root first, then alphabetical.
  entries.sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path)));
  return entries;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = buildEntries();

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            `    <changefreq>${e.changefreq}</changefreq>`,
            `    <priority>${e.priority}</priority>`,
            `  </url>`,
          ].join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
