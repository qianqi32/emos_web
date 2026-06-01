import Link from "next/link";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  helper?: string;
  href?: string;
  className?: string;
}

export function MetricCard({ label, value, helper, href, className }: MetricCardProps) {
  const content = (
    <>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-3 font-mono text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      {helper ? <div className="mt-2 text-xs text-muted-foreground">{helper}</div> : null}
    </>
  );

  const cardClassName = cn("relative overflow-hidden rounded-3xl border border-border/60 bg-background/50 p-5 shadow-glass backdrop-blur-xl", href ? "block transition-colors hover:bg-background/70" : undefined, className);

  if (href) {
    return <Link href={href} className={cardClassName}>{content}</Link>;
  }

  return <div className={cardClassName}>{content}</div>;
}
