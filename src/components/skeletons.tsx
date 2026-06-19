export function HeroSkeleton() {
  return (
    <div className="mx-5 mt-2 rounded-3xl bg-canvas-deep/70 animate-pulse h-56" aria-hidden />
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded-2xl bg-canvas-deep/70 animate-pulse h-24 ${className}`} aria-hidden />;
}

export function HeaderSkeleton() {
  return (
    <div className="space-y-3 px-5 pt-10">
      <div className="h-3 w-24 rounded bg-canvas-deep animate-pulse" />
      <div className="h-8 w-48 rounded bg-canvas-deep animate-pulse" />
    </div>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
