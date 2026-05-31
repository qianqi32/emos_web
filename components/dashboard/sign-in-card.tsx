"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { getUser, signIn } from "@/lib/api/client";
import type { UserProfile } from "@/lib/api/types";

interface SignInCardProps {
  token: string;
  user: UserProfile;
  onUserChange: (user: UserProfile) => void;
}

export function SignInCard({ token, user, onUserChange }: SignInCardProps) {
  const [signContent, setSignContent] = useState("今天也要稳定运行");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignIn() {
    const content = signContent.trim();

    if (!content) {
      setMessage("请输入签到内容");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await signIn(content, token);
      const nextUser = await getUser(token);
      onUserChange(nextUser);
      setMessage(`签到成功，获得 ${result.earn_point} 萝卜，连续 ${result.continuous_days} 天`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "签到失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassPanel className="p-5 sm:p-6">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Daily Check-in
      </div>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-tight">每日签到</h2>
          <p className="mt-1 text-xs text-muted-foreground">常用操作，签到后会刷新萝卜余额与连续天数。</p>
          <input value={signContent} onChange={(event) => setSignContent(event.target.value)} className="mt-4 h-10 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
        </div>
        <button type="button" onClick={handleSignIn} disabled={loading || Boolean(user.sign)} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-50">
          <CheckCircle2 className="h-4 w-4" />
          {user.sign ? "今日已签到" : "立即签到"}
        </button>
      </div>
      {message ? <div className="mt-4 rounded-2xl border border-info/20 bg-info/10 px-4 py-3 text-sm text-info">{message}</div> : null}
    </GlassPanel>
  );
}
