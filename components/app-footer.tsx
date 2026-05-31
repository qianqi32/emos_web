import packageJson from "@/package.json";
import { ClientYear } from "@/components/client-year";

const VERSION = `v${packageJson.version}`;

export function AppFooter() {
  return (
    <footer className="mt-16 border-t border-border/40">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-4 px-3 py-6 text-center sm:flex-row sm:px-6 sm:text-left lg:px-12">
        <div className="text-sm text-muted-foreground">
          © <ClientYear /> EMOS Web. All rights reserved.
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-3 py-1 text-xs text-muted-foreground shadow-sm transition hover:border-border/80 hover:text-foreground">
          <span className="font-medium opacity-70">Ver.</span>
          <span className="font-mono">{VERSION}</span>
        </div>
      </div>
    </footer>
  );
}
