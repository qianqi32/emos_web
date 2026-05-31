import { Activity, Code2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface AppTopBarProps {
  compact?: boolean;
}

export function AppTopBar({ compact = false }: AppTopBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
        <Activity className="h-4 w-4" />
      </span>
      <span>EMOS CONTROL</span>
      {!compact ? <span className="h-4 w-px bg-border" /> : null}
      {!compact ? (
        <a suppressHydrationWarning className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground" href="https://github.com" target="_blank" rel="noreferrer">
          <Code2 className="h-3.5 w-3.5" />
          GitHub Sync
        </a>
      ) : null}
      <span className="h-4 w-px bg-border" />
      <ThemeToggle />
    </div>
  );
}
