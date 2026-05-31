export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-32 rounded-3xl bg-muted/50" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-32 rounded-2xl bg-muted/50" />
        <div className="h-32 rounded-2xl bg-muted/50" />
        <div className="h-32 rounded-2xl bg-muted/50" />
      </div>
      <div className="h-72 rounded-3xl bg-muted/50" />
    </div>
  );
}
