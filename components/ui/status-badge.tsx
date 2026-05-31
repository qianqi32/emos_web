import { cn } from "@/lib/utils";

type StatusTone = "success" | "warning" | "danger" | "info" | "muted";

const toneClassName: Record<StatusTone, string> = {
  success: "text-success bg-success/10 border-success/20",
  warning: "text-warning bg-warning/10 border-warning/20",
  danger: "text-danger bg-danger/10 border-danger/20",
  info: "text-info bg-info/10 border-info/20",
  muted: "text-muted-foreground bg-muted/50 border-border/60"
};

interface StatusBadgeProps {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
}

export function StatusBadge({ children, tone = "muted", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        toneClassName[tone],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
