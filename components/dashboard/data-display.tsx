"use client";

import { Copy } from "lucide-react";
import { displayValue } from "@/components/dashboard/format";

export function FieldRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/45 py-3 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-[62%] truncate text-right font-mono text-xs font-medium">{displayValue(value)}</span>
    </div>
  );
}

export function ServiceLink({ label, href, unavailableLabel = "未开通" }: { label: string; href: string | null; unavailableLabel?: string }) {
  async function handleCopy() {
    if (!href) {
      return;
    }

    await navigator.clipboard.writeText(href);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-muted/15 p-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground">{href ?? unavailableLabel}</div>
      </div>
      {href ? (
        <button type="button" onClick={handleCopy} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 transition-colors hover:bg-muted/40" aria-label={`复制 ${label}`}>
          <Copy className="h-4 w-4" />
        </button>
      ) : (
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/50 text-muted-foreground">—</span>
      )}
    </div>
  );
}
