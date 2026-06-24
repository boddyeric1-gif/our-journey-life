import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getAtlas, saveAtlasNote, exportAtlasPdf } from "@/lib/atlas.functions";
import { getCoupleEntitlements } from "@/lib/payments.functions";
import { AppShell } from "@/components/app-shell";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/atlas")({
  head: () => ({
    meta: [
      { title: "The Atlas — Our Journey" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AtlasPage,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

function AtlasPage() {
  const fetchEnt = useServerFn(getCoupleEntitlements);
  const fetchAtlas = useServerFn(getAtlas);
  const saveNote = useServerFn(saveAtlasNote);
  const exportPdf = useServerFn(exportAtlasPdf);
  const qc = useQueryClient();

  const ent = useQuery({ queryKey: ["entitlements"], queryFn: () => fetchEnt(), staleTime: 30_000 });
  const owns = ent.data?.atlas ?? false;

  const atlas = useQuery({
    queryKey: ["atlas"],
    queryFn: () => fetchAtlas(),
    enabled: owns,
    staleTime: 60_000,
  });

  const [note, setNote] = useState("");
  useEffect(() => { if (atlas.data) setNote(atlas.data.note); }, [atlas.data?.note]);

  const noteMut = useMutation({
    mutationFn: (body: string) => saveNote({ data: { body } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["atlas"] }); toast.success("Saved."); },
    onError: (e: any) => toast.error(e.message),
  });

  const pdfMut = useMutation({
    mutationFn: async () => {
      // Save the latest note first so the PDF includes it.
      if (atlas.data && note !== atlas.data.note) {
        await saveNote({ data: { body: note } });
      }
      return exportPdf();
    },
    onSuccess: (r) => {
      const bin = atob(r.pdfBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Our-Journey-Atlas-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Atlas saved to your device.");
    },
    onError: (e: any) => toast.error(e.message ?? "Could not export."),
  });

  if (!ent.isLoading && !owns) {
    return (
      <AppShell>
        <div className="px-5 pt-10">
          <p className="serif-italic text-rust">Premium</p>
          <h1 className="mt-2 font-serif text-3xl text-ink">The Atlas</h1>
          <p className="mt-3 text-sm text-ink-soft leading-relaxed">
            Your story together, gathered into a quiet scrapbook you can re-read
            or save to your device as a keepsake.
          </p>
          <Link
            to="/premium"
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-ink py-3.5 text-sm font-medium text-canvas"
          >
            Unlock the Atlas
          </Link>
        </div>
      </AppShell>
    );
  }

  if (atlas.isLoading || !atlas.data) {
    return <AppShell><div className="px-5 pt-10 text-ink-mute">Gathering your story…</div></AppShell>;
  }

  const a = atlas.data;
  return (
    <AppShell>
      <div className="snap-y snap-mandatory">
        {/* COVER */}
        <Page>
          <p className="serif-italic text-rust text-lg">The Atlas</p>
          <h1 className="mt-6 font-serif text-4xl text-ink leading-tight text-balance">
            {a.partnerNames.join("  &  ")}
          </h1>
          <p className="mt-6 text-sm text-ink-soft">Together since {a.since}</p>
          <p className="mt-1 text-sm text-ink-soft">{a.daysTogether} days, and counting.</p>
        </Page>

        {/* RHYTHM */}
        <Page label="Rhythm">
          <h2 className="font-serif text-2xl text-ink">How we've shown up</h2>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <Stat label="Current" value={`${a.rhythm.currentStreak}d`} />
            <Stat label="Longest" value={`${a.rhythm.longestStreak}d`} />
            <Stat label="Both, 12wk" value={`${a.rhythm.totalSharedDays}d`} />
          </div>
          <Heatmap cells={a.rhythm.heatmap} />
          <p className="mt-4 text-xs text-ink-mute italic">
            Each square is a day. Darker means both of you showed up.
          </p>
        </Page>

        {/* FIRST LETTER */}
        {a.letters.firstLetter && (
          <Page label="The first letter">
            <p className="text-xs text-ink-mute">{a.letters.firstLetter.date}</p>
            <blockquote className="mt-4 font-serif italic text-lg text-ink leading-relaxed text-pretty">
              "{a.letters.firstLetter.excerpt}"
            </blockquote>
          </Page>
        )}

        {/* LETTERS GATHERED */}
        <Page label="Letters, gathered">
          <h2 className="font-serif text-2xl text-ink">{a.letters.total} letters written</h2>
          {a.letters.longestLetter && (
            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-[0.18em] text-rust">The longest</p>
              <p className="mt-2 font-serif italic text-ink-soft leading-relaxed text-pretty">
                {a.letters.longestLetter.excerpt}
              </p>
            </div>
          )}
          {a.letters.latestLetter && (
            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-[0.18em] text-rust">The most recent</p>
              <p className="mt-2 font-serif italic text-ink-soft leading-relaxed text-pretty">
                {a.letters.latestLetter.excerpt}
              </p>
            </div>
          )}
        </Page>

        {/* CHAPTERS */}
        <Page label="Chapters walked">
          <h2 className="font-serif text-2xl text-ink">What you've moved through</h2>
          {a.chapters.length === 0 ? (
            <p className="mt-6 text-ink-mute italic">Your first chapter is still ahead.</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {a.chapters.map(c => (
                <li key={c.title} className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-ink">{c.title}</span>
                  <span className="text-xs text-ink-mute shrink-0">
                    {new Date(c.completedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Page>

        {/* THEMES */}
        <Page label="Themes">
          <h2 className="font-serif text-2xl text-ink">What kept showing up</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {a.themes.length === 0 ? (
              <p className="text-ink-mute italic">Themes will emerge as you walk more chapters.</p>
            ) : a.themes.map(t => (
              <span key={t.label} className="px-3 py-1.5 rounded-full border border-border bg-canvas-deep/40 text-sm text-ink-soft">
                {t.label} <span className="text-ink-mute">· {t.count}</span>
              </span>
            ))}
          </div>
        </Page>

        {/* MILESTONES */}
        <Page label="Milestones">
          <h2 className="font-serif text-2xl text-ink">Markers along the way</h2>
          <ol className="mt-6 space-y-3">
            {a.milestones.map((m, i) => (
              <li key={`${m.date}-${i}`} className="flex items-baseline gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-rust shrink-0" />
                <span className="text-xs text-ink-mute w-20 shrink-0">{m.date}</span>
                <span className="font-serif text-ink">{m.label}</span>
              </li>
            ))}
          </ol>
        </Page>

        {/* NOTE + EXPORT */}
        <Page label="A note from you">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            onBlur={() => { if (atlas.data && note !== atlas.data.note) noteMut.mutate(note); }}
            maxLength={2000}
            rows={8}
            placeholder="Add anything you want to remember about right now."
            className="w-full rounded-xl border border-border bg-card px-4 py-3 font-serif text-ink leading-relaxed"
          />
          <button
            onClick={() => pdfMut.mutate()}
            disabled={pdfMut.isPending}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-ink py-3.5 text-sm font-medium text-canvas disabled:opacity-40"
          >
            {pdfMut.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing…</>
              : <><Download className="h-4 w-4" /> Save scrapbook to your device</>}
          </button>
          <p className="mt-3 text-xs text-ink-mute text-center">
            A PDF you can keep, print, or share with each other.
          </p>
        </Page>
      </div>
    </AppShell>
  );
}

function Page({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <section className="snap-start min-h-[100svh] px-6 pt-10 pb-24 flex flex-col">
      {label && (
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute mb-6 border-b border-border pb-3">
          {label}
        </p>
      )}
      <div className="flex-1">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card py-3">
      <p className="font-serif text-xl text-ink">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.15em] text-ink-mute mt-1">{label}</p>
    </div>
  );
}

function Heatmap({ cells }: { cells: { iso: string; count: number }[] }) {
  // 12 cols × 7 rows
  return (
    <div className="mt-6 inline-grid grid-flow-col grid-rows-7 gap-1">
      {cells.map(c => (
        <div
          key={c.iso}
          title={`${c.iso} — ${c.count}/2`}
          className={`h-4 w-4 rounded-sm ${
            c.count === 2 ? 'bg-rust' : c.count === 1 ? 'bg-rust/45' : 'bg-canvas-deep border border-border'
          }`}
        />
      ))}
    </div>
  );
}
