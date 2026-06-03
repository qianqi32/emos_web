"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmText?: string;
  inputLabel?: string;
  inputValue?: string;
  inputPlaceholder?: string;
  inputType?: "text" | "number";
  error?: string;
  loading?: boolean;
  tone?: "default" | "danger";
  onInputChange?: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  confirmText,
  inputLabel,
  inputValue,
  inputPlaceholder,
  inputType = "text",
  error,
  loading = false,
  tone = "default",
  onInputChange,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <ConfirmDialogContent
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      confirmText={confirmText}
      inputLabel={inputLabel}
      inputValue={inputValue}
      inputPlaceholder={inputPlaceholder}
      inputType={inputType}
      error={error}
      loading={loading}
      tone={tone}
      onInputChange={onInputChange}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

function ConfirmDialogContent({
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmText,
  inputLabel,
  inputValue,
  inputPlaceholder,
  inputType,
  error,
  loading,
  tone,
  onInputChange,
  onConfirm,
  onCancel
}: Omit<ConfirmDialogProps, "open">) {
  const [confirmInput, setConfirmInput] = useState("");
  const currentInput = inputValue ?? "";
  const canConfirm = !confirmText || confirmInput === confirmText;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-background/70 px-3 py-4 backdrop-blur-md sm:p-6">
      <button type="button" aria-label="关闭确认框" className="fixed inset-0" onClick={loading ? undefined : onCancel} />
      <div className="relative my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-[2rem] border border-border/70 bg-background/95 shadow-2xl shadow-black/15 backdrop-blur-xl sm:max-h-[calc(100dvh-3rem)]">
        <div className="overflow-y-auto p-5 sm:p-6">
          <div className="flex items-start gap-4">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border", tone === "danger" ? "border-danger/25 bg-danger/10 text-danger" : "border-warning/25 bg-warning/10 text-warning")}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          <button type="button" onClick={onCancel} disabled={loading} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-muted/35 hover:text-foreground disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        {inputLabel ? (
          <label className="mt-5 block">
            <span className="mb-2 block text-xs text-muted-foreground">{inputLabel}</span>
            <input
              type={inputType}
              value={currentInput}
              placeholder={inputPlaceholder}
              onChange={(event) => onInputChange?.(event.target.value)}
              disabled={loading}
              className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
            />
          </label>
        ) : null}

        {confirmText ? (
          <label className="mt-5 block">
            <span className="mb-2 block text-xs text-muted-foreground">输入 <span className="font-mono text-foreground">{confirmText}</span> 继续</span>
            <input
              value={confirmInput}
              onChange={(event) => setConfirmInput(event.target.value)}
              disabled={loading}
              className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none transition-colors focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
            />
          </label>
        ) : null}

        {error ? <div className="mt-5 rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">{error}</div> : null}
        </div>

        <div className="grid shrink-0 gap-2 border-t border-border/60 bg-background/95 p-4 sm:grid-cols-2 sm:p-5">
          <button type="button" onClick={onCancel} disabled={loading} className="inline-flex h-11 items-center justify-center rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !canConfirm}
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
              tone === "danger" ? "bg-danger text-white" : "bg-foreground text-background"
            )}
          >
            {loading ? "处理中..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
