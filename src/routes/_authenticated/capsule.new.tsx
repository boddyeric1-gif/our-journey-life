import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { createTimeCapsule } from "@/lib/timeCapsule.functions";
import { AppShell } from "@/components/app-shell";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { ArrowLeft, Mic, Square, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/capsule/new")({
  head: () => ({ meta: [{ title: "Seal a Capsule — Our Journey" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: NewCapsule,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

function defaultUnlockIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
}

function NewCapsule() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createTimeCapsule);
  const [kind, setKind] = useState<'letter' | 'voice'>('letter');
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [recipient, setRecipient] = useState<'partner' | 'both' | 'self'>('partner');
  const [unlockDate, setUnlockDate] = useState(defaultUnlockIso());

  // Recording state
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDur, setAudioDur] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        setAudioBlob(blob);
        setAudioDur(Math.ceil((Date.now() - startTimeRef.current) / 1000));
        stream.getTracks().forEach(t => t.stop());
      };
      recRef.current = rec;
      startTimeRef.current = Date.now();
      rec.start();
      setRecording(true);
      // Auto-stop at 3 min
      setTimeout(() => { if (recRef.current?.state === 'recording') stopRecording(); }, 180_000);
    } catch (e: any) {
      toast.error("Microphone access denied.");
    }
  }
  function stopRecording() {
    recRef.current?.stop();
    setRecording(false);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const unlockAt = new Date(unlockDate + 'T09:00:00Z').toISOString();
      if (kind === 'letter') {
        return create({ data: {
          kind, title, body, recipient, unlock_at: unlockAt,
        } });
      }
      if (!audioBlob) throw new Error("Record an audio note first.");
      const buf = await audioBlob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const base64 = btoa(bin);
      const mime = audioBlob.type.includes('webm') ? 'audio/webm'
        : audioBlob.type.includes('mp4') ? 'audio/mp4'
        : audioBlob.type.includes('mpeg') ? 'audio/mpeg' : 'audio/ogg';
      return create({ data: {
        kind, title, recipient, unlock_at: unlockAt,
        audio_base64: base64,
        audio_mime: mime as any,
        audio_duration_sec: audioDur,
      } });
    },
    onSuccess: () => {
      toast.success("Sealed.");
      qc.invalidateQueries({ queryKey: ["time-capsules"] });
      navigate({ to: "/capsule" });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not seal."),
  });

  const canSubmit = !!title.trim() && (kind === 'letter' ? !!body.trim() : !!audioBlob);

  return (
    <AppShell>
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate({ to: "/capsule" })} className="text-ink-mute" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-serif text-xl text-ink">Seal a capsule</h1>
      </header>

      <div className="px-5 space-y-5">
        <div className="grid grid-cols-2 gap-2">
          {(['letter', 'voice'] as const).map(k => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-xl border px-4 py-3 text-sm inline-flex items-center justify-center gap-2 ${
                kind === k ? 'border-rust bg-rust/10 text-ink' : 'border-border bg-card text-ink-mute'
              }`}
            >
              {k === 'letter' ? <Mail className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {k === 'letter' ? 'Letter' : 'Voice note'}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">Title</span>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
            placeholder="For our first anniversary"
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink"
          />
        </label>

        {kind === 'letter' ? (
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">Letter</span>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={20000}
              rows={10}
              placeholder="Write the version of you that you want them to find."
              className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink font-serif leading-relaxed"
            />
          </label>
        ) : (
          <div>
            <span className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">Voice note</span>
            <div className="mt-2 rounded-xl border border-border bg-card p-5 text-center">
              {audioBlob ? (
                <>
                  <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
                  <p className="mt-2 text-xs text-ink-mute">{audioDur}s recorded</p>
                  <button onClick={() => { setAudioBlob(null); setAudioDur(0); }}
                    className="mt-2 text-xs text-rust underline">Re-record</button>
                </>
              ) : recording ? (
                <button onClick={stopRecording}
                  className="inline-flex items-center gap-2 rounded-full bg-rust px-5 py-3 text-sm text-card">
                  <Square className="h-4 w-4 fill-current" /> Stop
                </button>
              ) : (
                <button onClick={startRecording}
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm text-card">
                  <Mic className="h-4 w-4" /> Record (up to 3 min)
                </button>
              )}
            </div>
          </div>
        )}

        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">Opens on</span>
          <input
            type="date"
            value={unlockDate}
            min={new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10)}
            onChange={e => setUnlockDate(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink"
          />
        </label>

        <div>
          <span className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">For</span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(['partner', 'both', 'self'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRecipient(r)}
                className={`rounded-xl border px-3 py-2 text-xs ${
                  recipient === r ? 'border-rust bg-rust/10 text-ink' : 'border-border bg-card text-ink-mute'
                }`}
              >
                {r === 'partner' ? 'My partner' : r === 'both' ? 'Both of us' : 'Just me'}
              </button>
            ))}
          </div>
        </div>

        <button
          disabled={!canSubmit || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="w-full rounded-2xl bg-ink py-3.5 text-sm font-medium text-canvas disabled:opacity-40"
        >
          {mutation.isPending ? "Sealing…" : "Seal this capsule"}
        </button>

        <p className="text-xs text-ink-mute leading-relaxed">
          Once sealed, only the date can open it. You can edit or delete until 24 hours before it opens.
        </p>
      </div>
    </AppShell>
  );
}
