import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  helper?: string;
  className?: string;
}

export function MetricCard({ label, value, helper, className }: MetricCardProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-border/60 bg-background/50 p-5 shadow-glass backdrop-blur-xl", className)}>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-3 font-mono text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      {helper ? <div className="mt-2 text-xs text-muted-foreground">{helper}</div> : null}
    </div>
  );
}
