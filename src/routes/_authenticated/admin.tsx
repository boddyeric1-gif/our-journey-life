import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { HeaderSkeleton } from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminOverview,
  grantAdminByEmail,
  revokeAdmin,
  inspectCouple,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Our Journey" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: u.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw redirect({ to: "/" });
  },
  component: AdminPage,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

const PRODUCT_LABELS: Record<string, string> = {
  quests_advanced: "Advanced quests",
  time_capsule: "Time Capsule",
  the_atlas: "The Atlas",
};

function AdminPage() {
  const qc = useQueryClient();
  const overviewFn = useServerFn(getAdminOverview);
  const grantFn = useServerFn(grantAdminByEmail);
  const revokeFn = useServerFn(revokeAdmin);
  const inspectFn = useServerFn(inspectCouple);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => overviewFn(),
  });

  const [grantEmail, setGrantEmail] = useState("");
  const grant = useMutation({
    mutationFn: (email: string) => grantFn({ data: { email } }),
    onSuccess: () => {
      toast.success("Admin granted");
      setGrantEmail("");
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (user_id: string) => revokeFn({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Admin revoked");
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [coupleId, setCoupleId] = useState("");
  const inspect = useMutation({
    mutationFn: (id: string) => inspectFn({ data: { couple_id: id } }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <AppShell title="Admin">
        <HeaderSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin">
      <div className="space-y-6 pb-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              You
              <Badge variant="secondary">admin</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="text-muted-foreground">{data.me.email}</div>
            <div className="font-mono text-xs text-muted-foreground break-all">
              {data.me.user_id}
            </div>
            {data.myCouple ? (
              <>
                <Separator />
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Your couple
                  </div>
                  <div className="font-mono text-xs break-all">
                    {data.myCouple.couple_id}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {Object.entries(data.myCouple.unlocks).map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-lg border bg-card px-3 py-2 text-sm flex items-center justify-between"
                    >
                      <span>{PRODUCT_LABELS[k] ?? k}</span>
                      <Badge variant={v ? "default" : "outline"}>
                        {v ? "unlocked" : "locked"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">
                You are not in a couple yet — pair up to test couple unlocks.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admins</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="user@example.com"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                type="email"
              />
              <Button
                onClick={() => grant.mutate(grantEmail.trim())}
                disabled={!grantEmail.trim() || grant.isPending}
              >
                Grant
              </Button>
            </div>
            <div className="space-y-2">
              {data.admins.map((a) => (
                <div
                  key={a.user_id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm truncate">{a.email ?? "—"}</div>
                    <div className="font-mono text-xs text-muted-foreground truncate">
                      {a.user_id}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={a.user_id === data.me.user_id}
                      >
                        Revoke
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke admin?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {a.email ?? a.user_id} will lose admin access and any
                          couple bypass that came with it.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => revoke.mutate(a.user_id)}
                        >
                          Revoke
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inspect a couple</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="couple_id (uuid)"
                value={coupleId}
                onChange={(e) => setCoupleId(e.target.value)}
              />
              <Button
                onClick={() => inspect.mutate(coupleId.trim())}
                disabled={!coupleId.trim() || inspect.isPending}
              >
                Look up
              </Button>
            </div>
            {inspect.data && (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">XP:</span>{" "}
                  {inspect.data.xp}{" · "}
                  <span className="text-muted-foreground">Shared days:</span>{" "}
                  {inspect.data.shared_days}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Members
                  </div>
                  {inspect.data.members.map((m) => (
                    <div key={m.user_id} className="text-sm">
                      {m.email ?? "—"}{" "}
                      <span className="font-mono text-xs text-muted-foreground">
                        {m.user_id}
                      </span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Unlocks
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {Object.entries(inspect.data.unlocks).map(([k, v]) => (
                      <div
                        key={k}
                        className="rounded-lg border px-3 py-2 flex items-center justify-between"
                      >
                        <span>{PRODUCT_LABELS[k] ?? k}</span>
                        <Badge variant={v ? "default" : "outline"}>
                          {v ? "unlocked" : "locked"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Entitlements
                  </div>
                  {inspect.data.entitlements.length === 0 ? (
                    <div className="text-muted-foreground">None</div>
                  ) : (
                    inspect.data.entitlements.map((e, i) => (
                      <div key={i} className="text-sm">
                        {e.product} — {e.status}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
