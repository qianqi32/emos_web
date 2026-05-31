"use client";

import { Copy, Eye, EyeOff, KeyRound, Pencil, ShieldCheck, UploadCloud } from "lucide-react";
import { useState } from "react";
import { formatBoolean } from "@/components/dashboard/format";
import { GlassPanel } from "@/components/ui/glass-panel";
import { agreeUploadAgreement, getTemporaryPassword, getUser, resetPassword, toggleShowEmpty, updatePseudonym } from "@/lib/api/client";
import type { TemporaryPasswordResponse, UserProfile } from "@/lib/api/types";

interface AccountActionsPanelProps {
  token: string;
  user: UserProfile;
  onUserChange: (user: UserProfile) => void;
}

type ActionState = "idle" | "password" | "pseudonym" | "empty" | "reset" | "agreement" | "copy";

export function AccountActionsPanel({ token, user, onUserChange }: AccountActionsPanelProps) {
  const [pseudonym, setPseudonym] = useState(user.pseudonym ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState<TemporaryPasswordResponse | null>(null);
  const [action, setAction] = useState<ActionState>("idle");
  const [message, setMessage] = useState("");

  async function refreshUser() {
    const nextUser = await getUser(token);
    onUserChange(nextUser);
    return nextUser;
  }

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
    void runAction("password", async () => {
      const result = await getTemporaryPassword(token);
      setTemporaryPassword(result);
      await refreshUser();
      return `临时密码已生成，${result.second} 秒内有效`;
    });
  }

  function handleCopyTemporaryPassword() {
    if (!temporaryPassword) {
      return;
    }

    void runAction("copy", async () => {
      await navigator.clipboard.writeText(String(temporaryPassword.password));
      return "临时密码已复制";
    });
  }

  function handlePseudonymUpdate() {
    const name = pseudonym.trim();

    if (!name) {
      setMessage("请输入新的笔名");
      return;
    }

    void runAction("pseudonym", async () => {
      await updatePseudonym(name, token);
      await refreshUser();
      return "笔名已更新";
    });
  }

  function handleShowEmptyToggle() {
    void runAction("empty", async () => {
      const result = await toggleShowEmpty(token);
      onUserChange({ ...user, is_show_empty: result.is_show_empty });
      return result.is_show_empty ? "已显示空媒体库" : "已隐藏空媒体库";
    });
  }

  function handlePasswordReset() {
    const password = newPassword.trim();

    if (!password) {
      setMessage("请输入新的永久密码");
      return;
    }

    void runAction("reset", async () => {
      await resetPassword(password, token);
      setNewPassword("");
      await refreshUser();
      return "永久登录密码已重置";
    });
  }

  function handleAgreeUploadAgreement() {
    void runAction("agreement", async () => {
      await agreeUploadAgreement(token);
      await refreshUser();
      return "已同意上传协议";
    });
  }

  return (
    <GlassPanel className="p-5 sm:p-6">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Account Actions
      </div>
      <div className="mt-5 space-y-4">
        <div className="rounded-2xl border border-border/50 bg-muted/15 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">临时密码</div>
              <div className="mt-1 text-xs text-muted-foreground">用于相关服软件登录，注意有效期</div>
            </div>
            <button type="button" onClick={handleTemporaryPassword} disabled={action === "password"} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
              <KeyRound className="h-4 w-4" />
              获取密码
            </button>
          </div>
          {temporaryPassword ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/50 px-4 py-3 font-mono text-sm">
              <span>{temporaryPassword.password} · {temporaryPassword.second}s</span>
              <button type="button" onClick={handleCopyTemporaryPassword} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border/50 bg-muted/15 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">修改笔名</div>
              <div className="mt-1 text-xs text-muted-foreground">只对之后上传与邀请展示生效</div>
            </div>
            <button type="button" onClick={handlePseudonymUpdate} disabled={action === "pseudonym"} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
              <Pencil className="h-4 w-4" />
              保存
            </button>
          </div>
          <input value={pseudonym} onChange={(event) => setPseudonym(event.target.value)} placeholder="输入新的笔名" className="mt-3 h-10 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
        </div>

        <div className="rounded-2xl border border-border/50 bg-muted/15 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">永久登录密码</div>
              <div className="mt-1 text-xs text-muted-foreground">用于相关服软件登录</div>
            </div>
            <button type="button" onClick={handlePasswordReset} disabled={action === "reset"} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
              <KeyRound className="h-4 w-4" />
              重置
            </button>
          </div>
          <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="输入新的永久密码" type="password" className="mt-3 h-10 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={handleShowEmptyToggle} disabled={action === "empty"} className="flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl border border-border/50 bg-muted/15 px-4 text-left transition-colors hover:bg-muted/35 disabled:cursor-not-allowed disabled:opacity-50">
            <span>
              <span className="block text-sm font-semibold">显示空媒体库</span>
              <span className="mt-1 block text-xs text-muted-foreground">当前：{formatBoolean(user.is_show_empty)}</span>
            </span>
            {user.is_show_empty ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>

          <button type="button" onClick={handleAgreeUploadAgreement} disabled={action === "agreement"} className="flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl border border-border/50 bg-muted/15 px-4 text-left transition-colors hover:bg-muted/35 disabled:cursor-not-allowed disabled:opacity-50">
            <span>
              <span className="block text-sm font-semibold">上传协议</span>
              <span className="mt-1 block text-xs text-muted-foreground">同意后开放上传流程</span>
            </span>
            <UploadCloud className="h-4 w-4" />
          </button>
        </div>

        {message ? <div className="rounded-2xl border border-info/20 bg-info/10 px-4 py-3 text-sm text-info">{message}</div> : null}
      </div>
    </GlassPanel>
  );
}
