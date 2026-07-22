export function HeroSkeleton() {
  return (
    <div className="mx-5 mt-2 rounded-3xl loading-bloom h-56 border border-white/[0.06]" aria-hidden />
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded-2xl loading-bloom h-24 border border-white/[0.05] ${className}`} aria-hidden />;
}

export function HeaderSkeleton() {
  return (
    <div className="space-y-3 px-5 pt-10">
      <div className="h-3 w-24 rounded loading-bloom" />
      <div className="h-8 w-48 rounded loading-bloom" />
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
