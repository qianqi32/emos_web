"use client";

import { ChevronDown, UploadCloud } from "lucide-react";
import { useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import type { UserProfile } from "@/lib/api/types";

export function RawPayloadPanel({ user }: { user: UserProfile }) {
  const [open, setOpen] = useState(false);

  return (
    <GlassPanel className="p-5 sm:p-6">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-4 text-left">
        <span>
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <UploadCloud className="h-3.5 w-3.5" />
            Raw User Payload
          </span>
          <span className="mt-2 block text-xs text-muted-foreground">调试信息，默认收起。</span>
        </span>
        <ChevronDown className={open ? "h-4 w-4 shrink-0 rotate-180 text-muted-foreground transition-transform" : "h-4 w-4 shrink-0 text-muted-foreground transition-transform"} />
      </button>
      {open ? <pre className="mt-4 max-h-80 overflow-auto rounded-2xl border border-border/50 bg-muted/20 p-4 text-xs leading-6 text-muted-foreground">{JSON.stringify(user, null, 2)}</pre> : null}
    </GlassPanel>
  );
}
