import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { saveLetter } from "@/lib/onboarding.functions";
import { Mail, PenLine, X } from "lucide-react";
import { toast } from "sonner";

type Letter = {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  is_first_letter?: boolean | null;
};

export function LettersInbox({
  letters, myId, partnerName,
}: { letters: Letter[]; myId: string; partnerName: string | null }) {
  const qc = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState("");
  const send = useServerFn(saveLetter);

  const mutation = useMutation({
    mutationFn: () => send({ data: { body } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home-state"] });
      toast.success("Letter sent.");
      setBody("");
      setComposing(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't send letter"),
  });

  const fromPartner = letters.filter(l => l.author_id !== myId);
  const fromMe = letters.filter(l => l.author_id === myId);
  const isEmpty = fromPartner.length === 0 && fromMe.length === 0;

  return (
    <section className="px-5 mt-6">
      <div className="flex items-end justify-between mb-3">
        <h2 className="font-serif text-xl text-ink inline-flex items-center gap-2">
          <Mail className="h-4 w-4 text-rust" /> Letters
        </h2>
        {!isEmpty && (
          <button
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-rust hover:underline underline-offset-4"
          >
            <PenLine className="h-3.5 w-3.5" /> Write one
          </button>
        )}
      </div>

      {isEmpty && (
        <article className="surface-card p-6 text-center">
          <Mail className="h-5 w-5 text-rust mx-auto" />
          <p className="mt-3 font-serif text-lg text-ink">No letters yet</p>
          <p className="mt-1 text-sm text-ink-soft text-pretty">
            Letters are slow love — a quiet note that lives in your archive forever.
          </p>
          <button
            onClick={() => setComposing(true)}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-canvas hover:opacity-90"
          >
            <PenLine className="h-4 w-4" /> Write the first letter
          </button>
        </article>
      )}

      {!isEmpty && fromPartner.length === 0 && (
        <article className="surface-card-quiet p-4 mb-3 border border-dashed border-border">
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-mute">
            From {partnerName ?? "your partner"}
          </p>
          <p className="mt-1 text-sm text-ink-soft serif-italic">Their letter will land here.</p>
        </article>
      )}

      <div className="space-y-3">
        {fromPartner.map(l => (
          <article key={l.id} className="surface-card p-5 border-l-2 border-rust">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-mute">
              From {partnerName ?? "your partner"} {l.is_first_letter ? "· first letter" : ""}
            </p>
            <p className="mt-2 serif-italic text-ink leading-relaxed text-pretty">"{l.body}"</p>
            <p className="mt-2 text-[11px] text-ink-mute">{new Date(l.created_at).toLocaleDateString()}</p>
          </article>
        ))}
        {fromMe.map(l => (
          <article key={l.id} className="surface-card-quiet p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-mute">
              From you {l.is_first_letter ? "· first letter" : ""}
            </p>
            <p className="mt-2 serif-italic text-ink-soft leading-relaxed text-pretty">"{l.body}"</p>
            <p className="mt-2 text-[11px] text-ink-mute">{new Date(l.created_at).toLocaleDateString()}</p>
          </article>
        ))}
      </div>

      {composing && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-4" onClick={() => setComposing(false)}>
          <div className="surface-card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg text-ink">Write a letter</h3>
              <button onClick={() => setComposing(false)} className="p-1 text-ink-mute hover:text-ink"><X className="h-4 w-4" /></button>
            </div>
            <textarea
              autoFocus
              value={body}
              onChange={e => setBody(e.target.value.slice(0, 2000))}
              rows={6}
              placeholder={`Something you want ${partnerName ?? "them"} to read…`}
              className="mt-3 w-full rounded-2xl border border-border bg-card px-4 py-3 text-base text-ink placeholder:text-ink-mute outline-none focus:border-rust serif-italic"
            />
            <p className="mt-1 text-right text-[11px] text-ink-mute">{body.length}/2000</p>
            <button
              onClick={() => mutation.mutate()}
              disabled={!body.trim() || mutation.isPending}
              className="mt-2 w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-canvas hover:opacity-90 disabled:opacity-60"
            >
              {mutation.isPending ? "Sending…" : "Send letter"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
