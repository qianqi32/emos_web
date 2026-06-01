import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassPanel = forwardRef<HTMLElement, GlassPanelProps>(function GlassPanel({ children, className }, ref) {
  return (
    <section
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/60 bg-background/50 shadow-glass backdrop-blur-xl",
        className
      )}
    >
      {children}
    </section>
  );
});
