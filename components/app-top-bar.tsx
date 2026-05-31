import { Activity, Code2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface AppTopBarProps {
  compact?: boolean;
}

export function AppTopBar({ compact = false }: AppTopBarProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background" title="EMOS Control" aria-label="EMOS Control">
        <Activity className="h-4 w-4" />
      </span>
      {!compact ? <span className="hidden whitespace-nowrap sm:inline">EMOS CONTROL</span> : null}
      {!compact ? <span className="hidden h-4 w-px bg-border sm:block" /> : null}
      {!compact ? (
        <a suppressHydrationWarning className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/40 bg-background/60 text-muted-foreground backdrop-blur-sm transition-all hover:bg-background/80 hover:text-foreground" href="https://github.com" target="_blank" rel="noreferrer" title="GitHub Sync" aria-label="GitHub Sync">
          <Code2 className="h-4 w-4" />
        </a>
      ) : null}
      {!compact ? <span className="hidden h-4 w-px bg-border sm:block" /> : null}
      <ThemeToggle />
    </div>
  );
}
