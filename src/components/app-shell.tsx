import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Home, Sparkles, Compass, User } from "lucide-react";
import { getHomeState } from "@/lib/home.functions";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 min-h-[100svh] pb-24 max-w-xl mx-auto">
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
    { to: "/quests" as const, label: "Quests", icon: Compass, match: (p: string) => p.startsWith("/quests"), emphasis: false, dot: false },
    { to: "/daily" as const, label: "Daily", icon: Sparkles, match: (p: string) => p === "/daily", emphasis: true, dot: !!dailyDot },
    { to: "/profile" as const, label: "You", icon: User, match: (p: string) => p === "/profile", emphasis: false, dot: false },
  ];
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-40 pointer-events-none"
    >
      <div className="max-w-xl mx-auto px-4 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        <div className="pointer-events-auto surface-card flex items-center justify-around px-2 py-2">
          {tabs.map(t => {
            const active = t.match(pathname);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`relative flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition ${
                  active ? "text-rust" : "text-ink-mute hover:text-ink"
                }`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 ${t.emphasis && !active ? "text-ink" : ""}`} strokeWidth={active ? 2.2 : 1.6} />
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
