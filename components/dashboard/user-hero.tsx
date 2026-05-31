"use client";

import { Activity, Check, Copy, KeyRound, Shield, UserRound } from "lucide-react";
import { useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import type { UserProfile } from "@/lib/api/types";

interface UserHeroProps {
  token: string;
  user: UserProfile;
}

type CopyTarget = "id" | "token" | "password";

export function UserHero({ token, user }: UserHeroProps) {
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const displayName = user.pseudonym ?? user.username;
  const roles = user.roles.length ? user.roles.join(" / ") : "普通用户";

  async function copyValue(target: CopyTarget, value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") {
      return;
    }

    await navigator.clipboard.writeText(String(value));
    setCopied(target);
    window.setTimeout(() => setCopied(null), 1200);
  }

  return (
    <GlassPanel className="p-5 sm:p-6 lg:p-8">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="flex items-start gap-4">
          {user.avatar ? <div aria-label={displayName} className="h-14 w-14 shrink-0 rounded-2xl border border-border/60 bg-cover bg-center" style={{ backgroundImage: `url(${user.avatar})` }} /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/30"><UserRound className="h-6 w-6" /></div>}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              Dashboard
            </div>
            <h1 className="mt-2 truncate text-2xl font-bold tracking-tight sm:text-3xl">欢迎，{displayName}</h1>
            <p className="mt-2 truncate text-sm text-muted-foreground">{user.username} · {roles}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border/50 bg-muted/15 p-2 lg:min-w-64">
          <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Credentials</div>
          <div className="grid grid-cols-3 gap-1">
            <button type="button" title={copied === "id" ? "已复制用户 ID" : "复制用户 ID"} onClick={() => copyValue("id", user.user_id)} className="inline-flex h-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/45 hover:text-foreground" aria-label="复制用户 ID">
              {copied === "id" ? <Check className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
            </button>
            <button type="button" title={copied === "token" ? "已复制 Token" : "复制 Token"} onClick={() => copyValue("token", token)} className="inline-flex h-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/45 hover:text-foreground" aria-label="复制 Token">
              {copied === "token" ? <Check className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            </button>
            <button type="button" title={user.password ? copied === "password" ? "已复制密码" : "复制密码" : "暂无可复制密码"} onClick={() => copyValue("password", user.password)} disabled={!user.password} className="inline-flex h-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/45 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50" aria-label="复制密码">
              {copied === "password" ? <Check className="h-4 w-4" /> : user.password ? <Copy className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
