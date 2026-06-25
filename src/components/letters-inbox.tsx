import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { saveLetter } from "@/lib/onboarding.functions";
import { markLettersSeen } from "@/lib/couple.functions";
import { Mail, PenLine, X } from "lucide-react";
import { toast } from "sonner";

type Letter = {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  is_first_letter?: boolean | null;
  seen_at?: string | null;
};

/**
 * Letters surface. Two modes:
 *   - inline: legacy in-page list (still used in places that want it on the page)
 *   - sheet : a modal sheet opened from the home header
 *
 * Unread letters (partner-authored with null seen_at) sort to the top, get
 * a quiet unread dot, and are marked seen on first display.
 */
export function LettersInbox({
  letters,
  myId,
  partnerName,
  mode = "inline",
  open = false,
  onClose,
}: {
  letters: Letter[];
  myId: string;
  partnerName: string | null;
  mode?: "inline" | "sheet";
  open?: boolean;
  onClose?: () => void;
}) {
  const qc = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState("");
  const send = useServerFn(saveLetter);
  const seen = useServerFn(markLettersSeen);

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

  // Sort: unread (partner, no seen_at) first, then newest first by date.
  const ordered = useMemo(() => {
    const fromPartner = letters.filter(l => l.author_id !== myId);
    const fromMe = letters.filter(l => l.author_id === myId);
    const unread = fromPartner.filter(l => !l.seen_at);
    const readFromPartner = fromPartner.filter(l => !!l.seen_at);
    return [...unread, ...readFromPartner, ...fromMe];
  }, [letters, myId]);

  const unreadIds = useMemo(
    () => letters.filter(l => l.author_id !== myId && !l.seen_at).map(l => l.id),
    [letters, myId],
  );

  // Mark seen on first display of the surface (inline = on mount; sheet = on open).
  const visible = mode === "inline" || open;
  useEffect(() => {
    if (!visible || unreadIds.length === 0) return;
    let cancelled = false;
    seen({ data: { letterIds: unreadIds } })
      .then(() => { if (!cancelled) qc.invalidateQueries({ queryKey: ["home-state"] }); })
      .catch(() => { /* silent — seen_at is best-effort */ });
    return () => { cancelled = true; };
  }, [visible, unreadIds, seen, qc]);

  const isEmpty = ordered.length === 0;

  const body_ui = (
    <>
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
            className="mt-4 inline-flex items-center justify-center gap-2 btn-primary"
          >
            <PenLine className="h-4 w-4" /> Write the first letter
          </button>
        </article>
      )}

      <div className="space-y-3">
        {ordered.map(l => {
          const mine = l.author_id === myId;
          const unread = !mine && !l.seen_at;
          return (
            <article
              key={l.id}
              className={`p-5 ${mine ? "surface-card-quiet" : "surface-card border-l-2 border-rust"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-ink-mute">
                  {mine ? "From you" : `From ${partnerName ?? "your partner"}`}
                  {l.is_first_letter ? " · first letter" : ""}
                </p>
                {unread && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-rust">
                    <span className="h-1.5 w-1.5 rounded-full bg-rust" aria-hidden /> New
                  </span>
                )}
              </div>
              <p className={`mt-2 serif-italic ${mine ? "text-ink-soft" : "text-ink"} leading-relaxed text-pretty text-[16px]`}>
                "{l.body}"
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[11px] text-ink-mute">
                  {new Date(l.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                </p>
                {!mine && (
                  <button
                    onClick={() => setComposing(true)}
                    className="text-[11px] uppercase tracking-[0.16em] text-rust hover:underline underline-offset-4"
                  >
                    Write one back
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {composing && (
        <Composer
          partnerName={partnerName}
          body={body}
          setBody={setBody}
          pending={mutation.isPending}
          onSend={() => mutation.mutate()}
          onClose={() => {
            if (!body.trim() || confirm("Discard this letter?")) setComposing(false);
          }}
        />
      )}
    </>
  );

  if (mode === "inline") {
    return <section className="px-5 mt-6">{body_ui}</section>;
  }

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-end sm:items-center justify-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Letters"
      onClick={onClose}
    >
      <div
        className="surface-card w-full max-w-xl max-h-[88svh] overflow-y-auto p-5 sm:p-6 rounded-t-3xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">Letters</p>
          <button
            onClick={onClose}
            aria-label="Close letters"
            className="p-1 text-ink-mute hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {body_ui}
      </div>
    </div>
  );
}

function Composer({
  partnerName, body, setBody, pending, onSend, onClose,
}: {
  partnerName: string | null;
  body: string;
  setBody: (s: string) => void;
  pending: boolean;
  onSend: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] bg-ink/40 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="letter-compose-title"
      onClick={onClose}
    >
      <div className="surface-card w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 id="letter-compose-title" className="font-serif text-lg text-ink">Write a letter</h3>
          <button onClick={onClose} aria-label="Close" className="p-1 text-ink-mute hover:text-ink">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <textarea
          autoFocus
          value={body}
          onChange={e => setBody(e.target.value.slice(0, 2000))}
          rows={6}
          placeholder={`Something you want ${partnerName ?? "them"} to read…`}
          className="mt-3 w-full rounded-2xl border border-border bg-card px-4 py-3 text-[16px] leading-[1.55] text-ink placeholder:text-ink-mute outline-none focus:border-rust serif-italic"
        />
        <p className="mt-1 text-right text-[11px] text-ink-mute">{body.length}/2000</p>
        <button
          onClick={onSend}
          disabled={!body.trim() || pending}
          className="mt-2 w-full btn-primary disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send letter"}
        </button>
      </div>
    </div>
  );
}
