type Status = "active-now" | "active-today" | null;

export function PartnerPresencePill({
  name,
  status,
  statusLabel,
}: {
  name: string | null;
  status: Status;
  statusLabel: string | null;
}) {
  if (!statusLabel || !status) return null;

  const dotClass =
    status === "active-now"
      ? "bg-emerald-500"
      : "bg-ink-mute/60";

  return (
    <p className="px-5 -mt-1 mb-2 flex items-center gap-2 text-[12px] text-ink-mute">
      {name && <span className="text-ink-soft">{name}</span>}
      {name && <span aria-hidden>·</span>}
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`}
        aria-hidden
      />
      <span>{statusLabel}</span>
    </p>
  );
}
