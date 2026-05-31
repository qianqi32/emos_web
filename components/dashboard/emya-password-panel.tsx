"use client";

import { Copy, KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { getTemporaryPassword, resetPassword } from "@/lib/api/client";
import type { TemporaryPasswordResponse } from "@/lib/api/types";

type ActionState = "idle" | "temporary" | "copy" | "reset";

export function EmyaPasswordPanel({ token }: { token: string }) {
  const [temporaryPassword, setTemporaryPassword] = useState<TemporaryPasswordResponse | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [action, setAction] = useState<ActionState>("idle");
  const [message, setMessage] = useState("");

  async function runAction(nextAction: ActionState, task: () => Promise<string>) {
    setAction(nextAction);
    setMessage("");

    try {
      const nextMessage = await task();
      setMessage(nextMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setAction("idle");
    }
  }

  function handleTemporaryPassword() {
    void runAction("temporary", async () => {
      const result = await getTemporaryPassword(token);
      setTemporaryPassword(result);
      return `Emya 一次登录密码已生成，${result.second} 秒内有效`;
    });
  }

  function handleCopyTemporaryPassword() {
    if (!temporaryPassword) {
      return;
    }

    void runAction("copy", async () => {
      await navigator.clipboard.writeText(String(temporaryPassword.password));
      return "Emya 登录密码已复制";
    });
  }

  function handleResetPassword() {
    const password = newPassword.trim();

    if (!password) {
      setMessage("请输入新的 Emya 永久密码");
      return;
    }

    void runAction("reset", async () => {
      await resetPassword(password, token);
      setNewPassword("");
      setTemporaryPassword(null);
      return "Emya 永久登录密码已重置";
    });
  }

  return (
    <GlassPanel className="p-5 sm:p-6">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Emya Security
      </div>
      <h2 className="mt-3 text-lg font-semibold tracking-tight">Emya 登录密码</h2>
      <p className="mt-1 text-sm text-muted-foreground">获取一次登录密码或重置 Emya 永久登录密码。密码只在当前页面展示，不会写入日志。</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/50 bg-muted/15 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">一次登录密码</div>
              <div className="mt-1 text-xs text-muted-foreground">适用于需要临时密码的 Emya 登录场景</div>
            </div>
            <button type="button" onClick={handleTemporaryPassword} disabled={action === "temporary"} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
              <KeyRound className="h-4 w-4" />
              获取密码
            </button>
          </div>
          {temporaryPassword ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/50 px-4 py-3 font-mono text-sm">
              <span className="min-w-0 truncate">{temporaryPassword.password} · {temporaryPassword.second}s</span>
              <button type="button" onClick={handleCopyTemporaryPassword} disabled={action === "copy"} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 disabled:cursor-not-allowed disabled:opacity-50" aria-label="复制 Emya 临时密码">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border/50 bg-muted/15 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">永久登录密码</div>
              <div className="mt-1 text-xs text-muted-foreground">用于 Emya 软件长期登录</div>
            </div>
            <button type="button" onClick={handleResetPassword} disabled={action === "reset"} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
              <KeyRound className="h-4 w-4" />
              重置
            </button>
          </div>
          <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="输入新的 Emya 永久密码" type="password" className="mt-3 h-10 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
        </div>
      </div>

      {message ? <div className="mt-5 rounded-2xl border border-info/20 bg-info/10 px-4 py-3 text-sm text-info">{message}</div> : null}
    </GlassPanel>
  );
}
