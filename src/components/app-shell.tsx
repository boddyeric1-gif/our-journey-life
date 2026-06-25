import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Home, Sparkles, Compass, User } from "lucide-react";
import { getHomeState } from "@/lib/home.functions";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 min-h-[100svh] pb-28 max-w-xl mx-auto">
      {children}
      <BottomTabs />
    </div>
  );
}

function BottomTabs() {
  const { pathname } = useLocation();
  const fetchHome = useServerFn(getHomeState);
  const home = useQuery({
    queryKey: ["home-state"],
    queryFn: () => fetchHome(),
    staleTime: 30_000,
  });

  const data = home.data as any;
  const dailyDot = data?.kind === "paired" && data?.prompt && !data?.myResponse;

  const tabs = [
    { to: "/home" as const, label: "Home", icon: Home, match: (p: string) => p === "/home", emphasis: false, dot: false },
    { to: "/daily" as const, label: "Daily", icon: Sparkles, match: (p: string) => p === "/daily", emphasis: true, dot: !!dailyDot },
    { to: "/quests" as const, label: "Quests", icon: Compass, match: (p: string) => p.startsWith("/quests"), emphasis: false, dot: false },
    { to: "/profile" as const, label: "You", icon: User, match: (p: string) => p === "/profile", emphasis: false, dot: false },
  ];
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-40 pointer-events-none"
    >
      <div className="max-w-xl mx-auto px-4 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        <div className="pointer-events-auto surface-card-floating flex items-center justify-around px-2 py-1.5">
          {tabs.map(t => {
            const active = t.match(pathname);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`tap relative flex-1 flex flex-col items-center gap-1 py-2 rounded-xl ${
                  active ? "text-rust" : "text-ink-mute hover:text-ink"
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-1 left-1/2 -translate-x-1/2 h-[3px] w-7 rounded-full bg-rust/80 shadow-[0_0_10px_oklch(0.71_0.075_32/0.55)]"
                  />
                )}
                <div className="relative">
                  <Icon className={`h-[20px] w-[20px] ${t.emphasis && !active ? "text-ink" : ""}`} strokeWidth={active ? 2.1 : 1.6} />
                  {t.dot && (
                    <span className="absolute -top-0.5 -right-1.5 h-2 w-2 rounded-full bg-rust ring-2 ring-card" aria-label="New today" />
                  )}
                </div>
                <span className={`text-[10px] tracking-wide ${active ? "font-medium" : ""}`}>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

    </nav>
  );
}
