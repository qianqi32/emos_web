"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { uploadTemporaryFile } from "@/lib/api/client";

interface TemporaryFileInputProps {
  label: string;
  value: string;
  emosId: string;
  placeholder?: string;
  accept?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onUploadedFileType?: (fileType: string) => void;
  onMessage?: (message: string) => void;
}

export function TemporaryFileInput({ label, value, emosId, placeholder = "输入 URL，或选择文件上传后自动回填", accept, disabled, onChange, onUploadedFileType, onMessage }: TemporaryFileInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (file.size > 80 * 1024 * 1024) {
      onMessage?.("临时文件不能超过 80MB");
      return;
    }

    if (!emosId) {
      onMessage?.("缺少当前用户 ID，无法上传临时文件");
      return;
    }

    setUploading(true);
    onMessage?.("正在上传临时文件...");

    try {
      const result = await uploadTemporaryFile(file, emosId);
      onChange(result.url);
      onUploadedFileType?.(file.type.split("/")[0] || "file");
      onMessage?.("临时文件上传成功，URL 已回填");
    } catch (error) {
      onMessage?.(error instanceof Error ? error.message : "临时文件上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled || uploading} placeholder={placeholder} className="h-11 min-w-0 flex-1 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:opacity-50" />
        <input ref={fileInputRef} type="file" accept={accept} onChange={(event) => void handleFileChange(event)} className="hidden" />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={disabled || uploading} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "上传中" : "上传文件"}
        </button>
      </div>
    </label>
  );
}
