import { cn } from "@/lib/utils";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassPanel({ children, className }: GlassPanelProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/60 bg-background/50 shadow-glass backdrop-blur-xl",
        className
      )}
    >
      {children}
    </section>
  );
}
