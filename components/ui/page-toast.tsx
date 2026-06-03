"use client";

import { CheckCircle2, Info, X } from "lucide-react";
import { useEffect } from "react";

type PageToastProps = {
  message: string;
  tone?: "default" | "success";
  onClose?: () => void;
};

export function PageToast({ message, tone = "success", onClose }: PageToastProps) {
  useEffect(() => {
    if (!message || !onClose) return;

    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const Icon = tone === "success" ? CheckCircle2 : Info;

  return (
    <div className="pointer-events-none fixed right-4 top-5 z-50 flex max-w-[calc(100vw-2rem)] justify-end sm:right-6">
      <div className="pointer-events-auto inline-flex min-h-11 max-w-md items-center gap-2 rounded-full border border-border/70 bg-background/90 px-4 py-2 text-sm font-medium text-foreground shadow-[0_14px_45px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <Icon className={tone === "success" ? "h-4 w-4 shrink-0 text-success" : "h-4 w-4 shrink-0 text-muted-foreground"} />
        <span className="min-w-0 truncate">{message}</span>
        {onClose ? (
          <button type="button" onClick={onClose} className="-mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground" aria-label="关闭提醒">
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
